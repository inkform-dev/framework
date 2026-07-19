# @inkform/framework — architecture & API contract

This is the stable contract that the engine, the themes, the CLI, and the
examples all build against. If you're writing a theme, this is the file to read.

The engine is **headless logic + a themeable component kit**. Themes are full
Next.js 16 apps that import the kit, arrange it, and restyle it with a token
file. The engine never bakes in colors, fonts, or a backend.

---

## 1. Content model

A site's content lives under `content/`:

```
content/
  docs/
    docs.json            # navigation + site config (the standard)
    openapi.json|yaml    # optional — the API Reference source
    index.mdx
    quickstart.mdx
    essentials/markdown.mdx
    ...
  blog/                  # optional
  changelog/             # optional
```

Override the content root with `DOCS_CONTENT_ROOT`. `docs.json` is the standard
config file; `freewrite.json` of the same shape is also accepted for backward
compatibility. `inkform.json` is reserved/unused.

### `docs.json` shape (`DocsConfig`, from `@inkform/framework/nav`)

```jsonc
{
  "name": "Aurora",
  "version": "1.0.0",
  "logo": "/logo.svg",                 // or { "light": "...", "dark": "..." }
  "favicon": "/favicon.svg",
  "colors": { "primary": "#5b8cff" },  // a theme MAY tint accents from this
  "navbarLinks": [{ "name": "Blog", "href": "/blog" }],
  "anchors": [{ "name": "GitHub", "href": "https://github.com/...", "icon": "github" }],
  "cta": { "label": "Dashboard", "href": "https://app.example.com" },
  "tabs": [                             // top-bar tabs: "Guides" | "API Reference"
    {
      "tab": "Guides",
      "navigation": [
        { "group": "Get Started", "pages": [
          { "title": "Introduction", "slug": "", "file": "index.mdx", "icon": "book" },
          { "title": "Quickstart", "slug": "quickstart", "file": "quickstart.mdx" }
        ]},
        { "group": "Essentials", "pages": [
          { "title": "Markdown", "slug": "essentials/markdown", "file": "essentials/markdown.mdx" }
        ]}
      ]
    },
    { "tab": "API Reference", "openapi": "openapi.json" }
  ]
}
```

A config with only `navigation` (no `tabs`) is treated as a single implicit tab.
`slug` is the URL path under the docs base (empty string = the index). `file` is
the MDX path relative to `content/docs`. Pages may nest via `children`.

Already implemented in `./nav`: `DocsConfig`, `DocsTab`, `DocsNavGroup`,
`DocsNavPage`, `DocsLink`, `FlatDocPage`, `docTabs(config)`,
`tabNavigation(config, tab?)`, `listDocPages(config, tab?)`,
`findDocPage(config, slug)`, `docNeighbours(config, slug)`.

Already implemented in `./content`: `loadDocsConfig(dir?)`, `loadDocPage(file, dir?)`,
`loadOpenApiSpec(file, dir?)`, `loadBlogPosts`, `loadChangelogEntries`,
`loadSlugHistory`, `readingTimeMinutes`, `extractHeadings(content)` →
`Heading[] = { depth, text, slug }`, `slugify(text)`.

---

## 2. OpenAPI engine — `./openapi` (file: `src/openapi.ts`)  ⟵ TO BUILD

Pure, no IO (IO is `loadOpenApiSpec` in `./content`). Parses an OpenAPI 3.x
spec (JSON or YAML) into a normalized model the API-reference UI renders.

### Frozen types

```ts
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace';

export interface JsonSchema {
  type?: string; format?: string; title?: string; description?: string;
  enum?: unknown[]; required?: string[];
  properties?: Record<string, JsonSchema>; items?: JsonSchema;
  example?: unknown; default?: unknown; nullable?: boolean;
  oneOf?: JsonSchema[]; anyOf?: JsonSchema[]; allOf?: JsonSchema[];
  $ref?: string;
  [k: string]: unknown;
}

export interface OpenApiInfo { title: string; version: string; description?: string; }
export interface OpenApiServer { url: string; description?: string; }
export interface ApiParam {
  name: string; in: 'query' | 'path' | 'header' | 'cookie';
  required: boolean; description?: string; schema?: JsonSchema; example?: unknown;
}
export interface ApiBody {
  description?: string; required: boolean; contentType: string;
  schema?: JsonSchema; example?: unknown;
}
export interface ApiResponse {
  status: string; description?: string; contentType?: string;
  schema?: JsonSchema; example?: unknown;
}
export interface ApiSecurity {
  key: string; type: string; scheme?: string; name?: string; in?: string; description?: string;
}
export interface ApiOperation {
  method: HttpMethod; path: string; operationId: string; // stable slug used in URLs/anchors
  summary: string; description?: string; tag: string; deprecated?: boolean;
  parameters: ApiParam[]; requestBody?: ApiBody | null;
  responses: ApiResponse[]; security: ApiSecurity[];
}
export interface OpenApiModel {
  info: OpenApiInfo; servers: OpenApiServer[];
  tags: { name: string; description?: string }[];
  operations: ApiOperation[];
}
export interface ApiNavGroup {
  group: string; // the tag
  items: { operationId: string; method: HttpMethod; path: string; summary: string }[];
}
```

### Frozen functions

```ts
export function parseOpenApi(raw: string, format?: 'json' | 'yaml'): OpenApiModel;
//  Parse JSON or YAML (auto-detect if format omitted: try JSON.parse, else YAML).
//  Resolve LOCAL $ref ("#/components/...") — deref params/bodies/responses/schemas
//  (cap recursion to avoid cycles). operationId = spec operationId, else
//  slugify(`${method}-${path}`). tag = first tag, else 'default'. Merge path-level
//  + operation-level parameters. Pull request/response bodies from
//  content["application/json"] (fall back to first content type). servers default
//  to [{ url: '/' }] if absent.

export function findOperation(model: OpenApiModel, operationId: string): ApiOperation | null;
export function operationNavGroups(model: OpenApiModel): ApiNavGroup[]; // group ops by tag, preserve order
export function sampleFromSchema(schema?: JsonSchema): unknown;
//  Recursively synthesize an example: honor example/default/first enum; else by type
//  (string→"<string>", integer/number→0/123, boolean→true, array→[item], object→{props}).
export function curlExample(op: ApiOperation, serverUrl: string): string;
//  Multiline curl: method, `${serverUrl}${path}` with path params substituted to
//  placeholders, `-H 'Authorization: Bearer <token>'` if security present,
//  `-H 'Content-Type: application/json'` + `-d '<sample JSON>'` for bodies.
export function schemaToTypeLabel(schema?: JsonSchema): string;
//  "string" | "integer<int32>" | "boolean" | "object" | "array<string>" | "string | null" ...
```

Add `export * from './openapi'` is already wired in `src/index.ts`. Dependencies
available: `yaml` (already in package.json).

---

## 3. MDX renderer — `./mdx` (file: `src/mdx.tsx`)

`<Mdx source={string} components={extra?} />` — already exists. **Add
`rehype-slug`** (already in deps) to the rehypePlugins so headings get `id`s that
match `extractHeadings`'s slugs (TOC anchor links). Keep the existing
remark-gfm + remark-directive callouts + rehype-pretty-code pipeline.

---

## 4. MDX component kit — `./components` (file: `src/components.tsx`)  ⟵ EXPAND

Export `mdxComponents(extra?)` (keep the Proxy fallback for unknown components)
registering ALL of the components below, plus each as a named export. Style
everything with `fw-*` classes (defined in `styles.css`) — no inline colors, no
Tailwind. Client components where interactivity is needed (`'use client'` at top
of those — but `components.tsx` is imported by the server `<Mdx>`, so put
interactive ones behind `'use client'` sub-modules OR mark the whole file with
care: prefer making Tabs/CodeGroup/Accordion their own `'use client'` and
re-export — keep it compiling under Next 16 RSC).

Keep existing: `Callout`, `Embed`, `Hero`, `AuthorBio`, `RelatedPosts`,
`NewsletterCTA` (keep generic — no product strings), `Playground`.

Add (Mintlify-grade):
- `Note`, `Tip`, `Info`, `Warning`, `Danger`, `Check` — wrappers over `Callout` with the matching type/icon.
- `Card({ title, icon?, href?, horizontal?, children })`, `CardGroup({ cols?=2, children })`.
- `Columns({ cols?=2, children })`.
- `Steps({ children })`, `Step({ title, icon?, children })` — numbered vertical stepper.
- `Tabs({ children })`, `Tab({ title, children })` — client, stateful tabbed panels.
- `Accordion({ title, defaultOpen?, icon?, children })`, `AccordionGroup({ children })` — client `<details>`-style.
- `CodeGroup({ children })` — client tabs over multiple fenced code blocks (read each child's title/filename).
- `ParamField({ query?|path?|body?|header?: string, name?, type?, required?, default?, deprecated?, children })` — a parameter row (name · type · required badge · description).
- `ResponseField({ name, type, required?, children })`.
- `Expandable({ title, defaultOpen?, children })`.
- `Frame({ caption?, children })` — bordered media frame.
- `Tooltip({ tip, children })`.

The framework must NOT bundle an icon library. Where an `icon` name is accepted,
render a small placeholder (e.g. a `fw-icon` span) OR accept a ReactNode. The
THEME supplies real icons (lucide) and passes a `renderIcon?: (name: string) =>
ReactNode` to `<DocsShell>` / `<Sidebar>`.

---

## 5. Layout shell — `./docs-shell` (file: `src/docs-shell.tsx`)  ⟵ TO BUILD

The 3-zone docs layout, driven entirely by CSS variables. Frozen signatures:

```ts
import type { ReactNode } from 'react';

export interface SidebarItem { title: string; href: string; active?: boolean; icon?: ReactNode; external?: boolean; depth?: number; }
export interface SidebarGroup { group: string; icon?: ReactNode; items: SidebarItem[]; }
export function Sidebar(props: { groups: SidebarGroup[]; header?: ReactNode; footer?: ReactNode }): ReactNode;

export interface TocHeading { depth: number; text: string; slug: string; }
export function TocList(props: { headings: TocHeading[]; title?: string }): ReactNode; // 'use client' — highlights active heading via IntersectionObserver

export function Pagination(props: { prev?: { title: string; href: string } | null; next?: { title: string; href: string } | null }): ReactNode;
export function Breadcrumbs(props: { trail: { label: string; href?: string }[] }): ReactNode;

export interface DocsShellProps {
  logo?: ReactNode;           // top-left brand
  topNav?: ReactNode;         // top-center: tabs (Guides | API Reference) or nav links
  topActions?: ReactNode;     // top-right: search trigger, theme toggle, Ask-AI, CTA
  sidebar?: ReactNode;        // usually <Sidebar groups=.../>
  toc?: ReactNode;            // usually <TocList .../>
  children: ReactNode;        // page body
  footer?: ReactNode;
  hideToc?: boolean;
  hideSidebar?: boolean;
}
export function DocsShell(props: DocsShellProps): ReactNode;
//  Renders: <header> (logo · topNav · topActions, sticky) ; a sticky left sidebar
//  (collapses to a mobile drawer toggled by a hamburger — that toggle is client) ;
//  a centered content column wrapping `children` ; a sticky right TOC rail.
//  Pure structure via `fw-shell-*` classes — NO colors inline.
```

---

## 6. API reference UI — `./api-reference` (file: `src/api-reference.tsx`)  ⟵ TO BUILD

Renders an endpoint page like the reference screenshots (method+path pill, "Try
it", Authorizations, Params, Request body, Responses with status tabs, and a
right rail with a cURL sample + response sample). Frozen signatures:

```ts
import type { ApiOperation, OpenApiServer } from './openapi';
export function ApiReferenceView(props: { operation: ApiOperation; servers: OpenApiServer[]; baseUrl?: string }): ReactNode;
export function ApiPlayground(props: { operation: ApiOperation; servers: OpenApiServer[]; onClose?: () => void }): ReactNode; // 'use client' modal — fills auth/params/body, real fetch, shows response
```

`ApiReferenceView` may be a server component that embeds a small client
`<TryItButton>` which lazy-opens `<ApiPlayground>`. Use `curlExample`,
`sampleFromSchema`, `schemaToTypeLabel` from `./openapi`. Method-pill colors come
from `--fw-method-*` tokens.

---

## 7. Ask-AI — `./ask-ai` (file: `src/ask-ai.tsx`)  ⟵ TO BUILD (feature-flagged)

```ts
export interface AskAiProps {
  enabled?: boolean;     // from NEXT_PUBLIC_DOCS_AI_ENABLED === 'true'
  endpoint?: string;     // default '/api/ask'
  label?: string;        // default 'Ask AI'
  placeholder?: string;  // default 'Ask a question…'
  product?: string;      // shown in the panel greeting
}
export function AskAi(props: AskAiProps): ReactNode; // 'use client'
```

Build the FULL UI (a pill button that opens a side panel/drawer with a chat
input + message list, matching the "Ask AI"/"Ask Assistant" screenshots). When
`enabled` is false, STILL render the button, but the panel shows a clearly
labeled "AI assistant is coming soon — enable `NEXT_PUBLIC_DOCS_AI_ENABLED`"
disabled state and the input is disabled. When enabled, POST
`{ messages }` to `endpoint` and render the streamed/returned answer. The actual
LLM call lives in the template's `/api/ask` route (which also respects the flag).

---

## 8. Theme toggle — `./theme-toggle` (file: `src/theme-toggle.tsx`)  ⟵ TO BUILD

```ts
export function ThemeToggle(props?: { className?: string }): ReactNode; // 'use client'
//  Toggles the `dark` class + data-theme on <html>, persists to localStorage,
//  defaults to prefers-color-scheme. Reads current state on mount (no flash).
export const themeInitScript: string;
//  A tiny IIFE string a theme injects in <head> (dangerouslySetInnerHTML) to set
//  the `dark` class before paint and avoid a flash of the wrong theme.
```

---

## 9. Styles & tokens — `./styles.css` (file: `src/styles.css`)  ⟵ EXPAND

Define `:root` token defaults and `.dark` overrides, then structural CSS keyed
off the tokens for EVERY class the kit emits. Themes override only the tokens.

Required token names (defaults are a neutral light/dark scheme):

```
--fw-bg, --fw-bg-subtle, --fw-fg, --fw-muted, --fw-border, --fw-border-strong,
--fw-primary, --fw-primary-fg, --fw-card, --fw-card-hover, --fw-code-bg, --fw-kbd-bg,
--fw-radius, --fw-radius-sm, --fw-font, --fw-mono, --fw-font-heading,
--fw-sidebar-w, --fw-toc-w, --fw-content-w, --fw-header-h,
--fw-method-get, --fw-method-post, --fw-method-put, --fw-method-patch, --fw-method-delete,
--fw-love, --fw-like,
--fw-shadow, --fw-ring
```

Required class families (themes rely on these existing): `fw-prose` (full
typographic styles for h1-h4, p, ul/ol, a, blockquote, table, hr, img, inline
`code`, fenced code via rehype-pretty-code `[data-rehype-pretty-code-figure]`),
`fw-shell` / `fw-shell-header` / `fw-shell-sidebar` / `fw-shell-content` /
`fw-shell-toc` / `fw-shell-main`, `fw-sidebar*`, `fw-toc*`, `fw-pagination`,
`fw-breadcrumbs`, `fw-tabs*`, `fw-steps*`, `fw-card*`, `fw-accordion*`,
`fw-codegroup*`, `fw-callout*` (info/warning/error/success), `fw-param*`,
`fw-response*`, `fw-apiref*` (incl. `fw-method-<verb>` pills), `fw-playground*`,
`fw-askai*`, `fw-theme-toggle`, `fw-search-*` (already used by SearchDialog),
`fw-reactions*`, `fw-comments*`, `fw-subscribe*`.

Dark theme: scope overrides under `html.dark` (the ThemeToggle toggles `dark` on
`<html>`).

---

## 10. The theme contract

A theme is a standalone Next.js 16 app that:
1. Has `content/docs/docs.json` + sample MDX + an `openapi.json` sample.
2. Imports `@inkform/framework/styles.css` once, then a `theme.css` that
   overrides the `--fw-*` tokens (its identity: colors, font, radius, density).
3. Routes `/[[...slug]]` (or `/docs/[[...slug]]`): resolve slug → MDX page or API
   operation; render with `<DocsShell>` + `<Sidebar>` + `<TocList>` + `<Mdx>` /
   `<ApiReferenceView>`.
4. Builds the search index at build time, mounts `<SearchDialog>`, `<ThemeToggle>`,
   `<AskAi enabled={process.env.NEXT_PUBLIC_DOCS_AI_ENABLED === 'true'} />`.
5. Ships `/api/ask` (flag-gated stub), `.env.example`, and a README with content +
   Vercel deploy guides.
6. `transpilePackages: ['@inkform/framework']` in `next.config.ts`.
7. Is `"private": true` with a unique workspace name `@inkform/theme-<name>`.

Themes differ by `theme.css` tokens + fonts + small layout accents — NOT by
re-implementing the shell.
