# @inkform/framework — architecture & API contract

This is the stable contract that the engine, the themes, the CLI, and the
examples all build against. If you're writing a theme, this is the file to read.

The engine is **headless logic + a themeable component kit**. Themes are full
Next.js 16 apps that import the kit, arrange it, and restyle it with a token
file. The engine never bakes in colors, fonts, or a backend.

Everything in this document is shipped, not planned — every section describes
what exists in `src/` today. Where a design decision or a real bug surfaced
during implementation is worth knowing before you touch that code, it's called
out inline.

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
  changelog/              # optional
```

Override the content root with `DOCS_CONTENT_ROOT` (legacy alias:
`INKFORM_CONTENT_ROOT`). `docs.json` is the standard config file;
`freewrite.json` of the same shape is also accepted for backward
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
    {
      "tab": "API Reference",
      "openapi": "openapi.json"
      // "apiReference": { "renderer": "scalar" }  — opt back into the Scalar
      // embed (bring your own app/api-reference/route.ts). Default is
      // 'native': per-operation pages via ./openapi-render, zero Scalar/Vue.
    }
  ]
}
```

A config with only `navigation` (no `tabs`) is treated as a single implicit tab.
`slug` is the URL path under the docs base (empty string = the index). `file` is
the MDX path relative to `content/docs`. Pages may nest via `children`.

Already implemented in `./nav`: `DocsConfig`, `DocsTab` (incl. `apiReference?:
{ renderer?: 'scalar' | 'native' }`, `mcp?: { name?, url?, disabled? }` — the
latter passed straight through to Scalar's own "Generate MCP" button when
`renderer: 'scalar'`), `DocsNavGroup`, `DocsNavPage`, `DocsLink`, `FlatDocPage`,
`docTabs(config)`, `tabNavigation(config, tab?)`, `listDocPages(config, tab?)`,
`findDocPage(config, slug)`, `docNeighbours(config, slug)`.

Already implemented in `./content`: `loadDocsConfig(dir?)`, `loadDocPage(file, dir?)`,
`loadOpenApiSpec(file, dir?)` (sync, local file only), `loadOpenApiSpecForBuild(openapi, dir?)`
(also handles a `https://` spec URL by fetching it at build time — used where the
parsed spec is needed inside the Next.js build itself, e.g. `ApiLink` and the
native renderer), `resolveOpenApiSource(openapi, dir?)` (resolves to whichever
shape Scalar's own client-side config expects: `{ url }` or `{ content }`),
`loadBlogPosts`, `loadBlogPost`, `loadSeries`, `loadChangelogEntries`,
`loadSlugHistory`, `readingTimeMinutes`, `extractHeadings(content)` →
`Heading[] = { depth, text, slug }`, `slugify(text)`.

---

## 2. OpenAPI parsing — `./openapi` + `./openapi-engine/*`

Two layers. `./openapi-engine/parse.ts` does the real spec-handling work
(bundling, dereferencing, validation) via Scalar's own parser packages —
`@scalar/json-magic` and `@scalar/openapi-parser` — which are pure spec-parsing
libraries with **no Vue dependency** (verified directly: their `package.json`
deps and compiled output were checked, not assumed). `./openapi.ts` normalizes
the fully-dereferenced document into this framework's own `OpenApiModel` shape,
which the rest of the framework (native renderer, MCP tools, ask-box, llms.txt)
builds on.

### `./openapi-engine/parse.ts`

```ts
export interface OpenApiParseError { path?: string[]; message: string; code?: string; }
export interface ParsedOpenApiDocument {
  schema: Record<string, unknown>; // fully dereferenced — every $ref (local or bundled-external) inlined
  valid: boolean;
  errors: OpenApiParseError[];
}
export interface ParseOpenApiEngineOptions { format?: 'json' | 'yaml'; baseDir?: string; }

export async function parseOpenApiDocument(raw: string, options?: ParseOpenApiEngineOptions): Promise<ParsedOpenApiDocument>;
//  Parses JSON or YAML (auto-detects if format omitted), then bundles + dereferences.
export async function bundleAndDereference(document: Record<string, unknown>, baseDir?: string): Promise<ParsedOpenApiDocument>;
//  Same, for a document that's already a JS object (e.g. re-parsing after an edit).
```

**A real gotcha, if you touch this file:** `@scalar/json-magic`'s `bundle()`
resolves relative `$ref`s via `path.resolve(path.dirname(origin), relativeRef)`
— it expects `origin` to look like a *file* path, not a directory, because it
calls `dirname()` on it internally. `bundleAndDereference` appends a synthetic
filename (`path.join(baseDir, '__entry__.yaml')`) before passing it as `origin`
so `dirname()` recovers `baseDir` exactly. Passing `baseDir` itself as `origin`
silently resolves relative refs one directory up.

### `./openapi-engine/nav.ts`

```ts
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace';
export interface NavOperationEntry { kind: 'operation'; operationId: string; method: HttpMethod; path: string; summary: string; deprecated: boolean; }
export interface NavWebhookEntry { kind: 'webhook'; name: string; method: HttpMethod; summary: string; deprecated: boolean; }
export interface NavModelEntry { kind: 'model'; name: string; title?: string; description?: string; }
export interface NavTagGroup { kind: 'tag-group'; tag: string; description?: string; operations: NavOperationEntry[]; }
export interface OpenApiNavTree { tagGroups: NavTagGroup[]; webhooks: NavWebhookEntry[]; models: NavModelEntry[]; }

export function buildNavTree(document: Record<string, unknown>): OpenApiNavTree;
//  Pure — doc (already dereferenced) → nav tree. Drives the reference sidebar,
//  MCP's list_operations, and llms.txt's API Reference section.
```

### `./openapi-engine/markdown.ts`

A native Markdown serializer — a deliberate substitute for
`@scalar/openapi-to-markdown`, which (unlike the parser packages above) turned
out to depend on Vue (`createSSRApp`, `vue/server-renderer`) despite looking
framework-agnostic from its name and README.

```ts
export function renderOperationMarkdown(document: Record<string, unknown>, selector: { path: string; method: HttpMethod } | { operationId: string }): string;
//  One operation as Markdown (summary, method+path, params table, request body, responses). Empty string if not found.
export function renderOpenApiMarkdown(document: Record<string, unknown>): string;
//  The whole spec as Markdown: title/description, then each tag-group's operations in order.
```

Used by MCP's `get_operation`/`search` tools and by `llms-full.txt`'s API
Reference section — one renderer, three consumers.

### `./openapi.ts`

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

export async function parseOpenApi(raw: string, format?: 'json' | 'yaml', options?: { baseDir?: string }): Promise<OpenApiModel>;
//  Async — delegates to parseOpenApiDocument for bundling/dereferencing, then
//  normalizes into OpenApiModel. operationId = spec operationId, else
//  slugify(`${method}-${path}`). tag = first tag, else 'default'. Merges
//  path-level + operation-level parameters. Never throws on malformed input —
//  degrades to an empty model.
export function findOperation(model: OpenApiModel, operationId: string): ApiOperation | null;
```

`sampleFromSchema` and `schemaToTypeLabel` moved to `./openapi-render` (they're
rendering concerns, not parsing ones — see below). `export * from './openapi'`
is wired in `src/index.ts`.

---

## 3. Native API reference rendering — `./openapi-render`

Per-operation pages rendered with this framework's own React components —
**zero Scalar/Vue dependency**. This is the default renderer
(`DocsTab.apiReference.renderer` defaults to `'native'`; `'scalar'` is a
documented escape hatch for a project that wants to bring back its own
`@scalar/nextjs-api-reference` embed, not a functional default — no shipped
example/template has a Scalar route left).

Public surface (`src/openapi-render/index.ts`):

```ts
export function OperationPage(props: { operation: ApiOperation; servers: OpenApiServer[]; baseUrl?: string }): ReactNode;
//  The full per-operation page: method+path header (both rendered with
//  data-pagefind-weight="2" so Pagefind ranks exact operationId/path matches
//  above incidental prose matches), summary, TryItConsole, security schemes,
//  servers, parameters, request body, responses, and CodeSamples — server
//  component; only TryItConsole hydrates client-side.

export function buildReferenceSidebarGroups(tree: OpenApiNavTree, basePath: string, activeOperationId?: string): SidebarGroup[];
export function ReferenceSidebar(props: { tree: OpenApiNavTree; basePath: string; activeOperationId?: string }): ReactNode;
//  Thin adapter onto docs-shell's generic Sidebar. Deliberately omits
//  Model/Webhook links — no detail pages exist for those yet.

export function schemaToTypeLabel(schema?: JsonSchema): string;
//  "string" | "integer<int32>" | "boolean" | "object" | "array<string>" | "string | null" ...
```

Internal modules (not re-exported — used by `OperationPage` itself):
`SchemaObject.tsx` (recursive `oneOf`/`anyOf`/`allOf` schema rendering, capped
at `MAX_SCHEMA_DEPTH = 8` with an explicit "nested too deep" message rather
than silently truncating), `Parameters.tsx`, `RequestBody.tsx`,
`Responses.tsx`, `SecuritySchemes.tsx`, `Servers.tsx`, `badges.tsx`
(`MethodPill`, `RequiredBadge`, `DeprecatedBadge`), `sample.ts`
(`sampleFromSchema` — recursively synthesizes an example value from a schema),
`CodeSamples.tsx` (wraps `@scalar/snippetz` — builds a HAR request object,
generates cURL/JavaScript/Python/Node.js samples).

### Try It — `./openapi-render/TryIt/*`

A real, client-side request console — not a code-sample display. `'use
client'` island; the page around it stays server-rendered/SSG.

```ts
// TryIt/request-executor.ts
export function buildTryItRequest(operation: ApiOperation, servers: OpenApiServer[], values: TryItValues): { url: string; init: RequestInit };
export async function executeTryItRequest(request: { url: string; init: RequestInit }, onChunk?: (chunk: string) => void): Promise<TryItResult>;
//  Real fetch(), with streaming support via ReadableStreamDefaultReader + onChunk.
```

Deliberately out of scope, by design (not a gap to fill casually): OAuth2 flows
and reading `Set-Cookie` — the latter is invisible to `fetch()` from JS by
browser design, not something a client-side console can work around.

---

## 4. MDX renderer — `./mdx` (file: `src/mdx.tsx`)

`<Mdx source={string} components={extra?} />`. Pipeline: `remark-gfm` +
`remark-directive` (callouts) + `rehype-slug` (heading `id`s matching
`extractHeadings`'s slugs, for TOC anchor links) + `rehype-pretty-code`
(Shiki-based syntax highlighting).

---

## 5. MDX component kit — `./components` (file: `src/components.tsx`)

`mdxComponents(extra?)` registers every component below (plus each as a named
export), with a `Proxy` fallback for unknown tags. Everything styles via
`fw-*` classes (`styles/*.css`) — no inline colors, no Tailwind. Interactive
components are their own `'use client'` sub-modules re-exported here, keeping
`components.tsx` itself safe to import from the server `<Mdx>`.

`Callout`, `Note`/`Tip`/`Info`/`Warning`/`Danger`/`Check` (typed `Callout`
wrappers), `Embed`, `Hero`, `AuthorBio`, `RelatedPosts`, `NewsletterCTA`,
`Playground`, `Card`/`CardGroup`, `Columns`, `Steps`/`Step`, `Tabs`/`Tab`
(client, stateful), `Accordion`/`AccordionGroup` (client), `CodeGroup` (client
tabs over fenced code blocks), `ParamField`, `ResponseField`, `Expandable`,
`Frame`, `Tooltip`.

The framework does NOT bundle an icon library. Where an `icon` name is
accepted, it renders a small placeholder (`fw-icon` span) or accepts a
`ReactNode` directly. The THEME supplies real icons (Lucide) via a
`renderIcon?: (name: string) => ReactNode` passed to `<DocsShell>` / `<Sidebar>`.

---

## 6. Layout shell — `./docs-shell` (file: `src/docs-shell.tsx`)

The 3-zone docs layout, driven entirely by CSS variables.

```ts
export interface SidebarItem { title: string; href: string; active?: boolean; icon?: ReactNode; external?: boolean; depth?: number; }
export interface SidebarGroup { group: string; icon?: ReactNode; items: SidebarItem[]; }
export function Sidebar(props: { groups: SidebarGroup[]; header?: ReactNode; footer?: ReactNode }): ReactNode;

export interface TocHeading { depth: number; text: string; slug: string; }
export function TocList(props: { headings: TocHeading[]; title?: string }): ReactNode; // 'use client' — highlights active heading via IntersectionObserver

export function Pagination(props: { prev?: { title: string; href: string } | null; next?: { title: string; href: string } | null }): ReactNode;
export function Breadcrumbs(props: { trail: { label: string; href?: string }[] }): ReactNode;

export type ContentType = 'doc' | 'api' | 'changelog' | 'blog';

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
  contentType?: ContentType;  // tags the indexed region with data-pagefind-filter="type:…"
}
export function DocsShell(props: DocsShellProps): ReactNode;
//  Renders: <header> (logo · topNav · topActions, sticky) ; a sticky left sidebar
//  (collapses to a mobile drawer toggled by a hamburger — that toggle is client) ;
//  a centered content column wrapping `children`, marked data-pagefind-body
//  (scopes the Pagefind index to just the article) and, when contentType is
//  given, data-pagefind-filter (drives search-result type badges/filtering) ;
//  a sticky right TOC rail. Pure structure via `fw-shell-*` classes — NO
//  colors inline.
```

Every page-level route (`[[...slug]]`, `api-reference/[[...slug]]`,
`changelog`, `blog`, `blog/[slug]`) passes its own `contentType` — see §12.

---

## 7. Ask-AI — `./ask-ai` (UI) + `./ai` (grounding)

Two pieces: `ask-ai.tsx` is the chat panel UI (framework-agnostic, no model
calls of its own); `./ai` is the BYO-model retrieval + generation logic a
theme's `/api/ask` route calls into.

### `./ask-ai` (file: `src/ask-ai.tsx`)

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

A pill button that opens a side panel/drawer with a chat input + message list.
When `enabled` is false, the button still renders, but the panel shows a
disabled state ("AI assistant is coming soon…") and the input is disabled.
When enabled, it POSTs `{ messages }` to `endpoint` and renders the response,
including a `sources` list (doc/operation title + link) under each assistant
reply when the response includes one.

### `./ai` (file: `src/ai/`)

```ts
// provider.ts
export function getModel(): LanguageModel;
//  BYO-provider: DOCS_AI_PROVIDER ('anthropic' | 'openai' | 'google', default
//  'anthropic') selects the Vercel AI SDK provider; DOCS_AI_MODEL overrides
//  the default model per provider; that provider's own API key env var
//  (ANTHROPIC_API_KEY, etc.) must be set or the first call throws.

// ask.ts
export interface AskSource { type: 'doc' | 'operation'; title: string; id: string; href: string; }
export interface AskResult { text: string; sources: AskSource[]; }
export async function askDocs(messages: ModelMessage[], options?: { apiBasePath?: string }): Promise<AskResult>;
//  Grounds a chat message in this site's own content: search() (from ./mcp)
//  ranks relevant doc pages/operations, then getDoc()/getOperation() fetch
//  each one's FULL content (not search's short excerpt) to build the system
//  prompt's context, then generateText(). apiBasePath builds clickable
//  operation source links — pass the app's own apiBasePath(config), WITH a
//  leading slash (e.g. "/api-reference"); the framework doesn't know any
//  one app's routing, so it can't derive this itself. Defaults to
//  '/api-reference' if omitted.
```

A theme's `/api/ask/route.ts` is a thin wrapper: check the feature flag,
parse+validate the request body, call `askDocs()`, return its result as JSON
(or a clean error). See any shipped example's `app/api/ask/route.ts` for the
~30-line reference implementation — it's identical across all 9 apps by
design (no per-app AI logic to drift).

---

## 8. MCP server — `./mcp`

A self-hostable [MCP](https://modelcontextprotocol.io) server exposing the
site's own content as tools — no external platform, no billing, BYO-deploy
(it's just another Next.js route handler).

```ts
// tools.ts — pure data functions, no MCP-protocol shapes
export interface McpSearchResult { type: 'doc' | 'operation'; title: string; id: string; excerpt: string; }
export async function search(query: string, limit?: number): Promise<McpSearchResult[]>;
export interface McpOperationSummary { operationId: string; method: string; path: string; summary: string; tag: string; }
export async function listOperations(): Promise<McpOperationSummary[]>;
export async function getOperation(operationId: string): Promise<string | null>; // Markdown, via renderOperationMarkdown
export async function getDoc(slug: string): Promise<string | null>; // raw MDX body
export async function loadApiDocument(): Promise<Record<string, unknown> | null>; // bundled+dereferenced spec, or null if none configured

// server.ts
export interface CreateMcpHandlerOptions { name?: string; }
export function createMcpHandler(options?: CreateMcpHandlerOptions): (request: Request) => Promise<Response>;
//  Wraps the tool core as real MCP tools via @modelcontextprotocol/sdk.
//  IMPORTANT: creates a fresh McpServer + transport pair PER REQUEST, inside
//  the returned handler — a stateless StreamableHTTPServerTransport cannot
//  be reused across requests (confirmed the hard way: a real client's
//  second request threw "Stateless transport cannot be reused across
//  requests" against an earlier version that created the transport once at
//  module scope, mirroring the SDK's own Hono doc example).
```

`search()` does NOT reuse Pagefind's index, despite that being a reasonable
first guess — checked first: the `pagefind` npm package's Node API
(`createIndex`/`addHTMLFile`/`writeFiles`) is index-*building* only, with no
server-side query function; Pagefind's actual search runs client-side via a
generated WASM runtime a Node route handler has no way to drive. Real search
instead, over doc pages + operation Markdown, via `fuse.js` with
`useTokenSearch: true` (splits multi-word natural-language queries into terms
with BM25-style IDF weighting — the default config returned zero results for
questions like "What does the id field mean?").

A theme's `/api/mcp/route.ts` is two lines: `const handler =
createMcpHandler({ name: '...' }); export { handler as GET, handler as POST,
handler as DELETE };` — created once at module scope and reused across warm
invocations (that's safe; it's the *transport*, created per-request inside
the handler, that can't be reused, not the handler function itself).

---

## 9. llms.txt — `./llms-txt` (file: `src/llms-txt.ts`)

Following the [llms.txt](https://llmstxt.org) convention: a plain-text entry
point into a site's content for LLMs/agentic tools, without crawling HTML.

```ts
export interface LlmsTxtOptions { apiBasePath?: string; } // same convention as ai/ask.ts — leading slash, defaults to '/api-reference'

export async function buildLlmsTxt(options?: LlmsTxtOptions): Promise<string>;
//  Curated index: H1 title, blockquote summary, then Markdown links grouped
//  under Docs / API Reference / Changelog / Blog (sections with no content
//  are omitted). Doc links carry each page's frontmatter `description`; API
//  links carry the operation summary + method + path.

export async function buildLlmsFullTxt(): Promise<string>;
//  The whole corpus concatenated: every doc page's full MDX body, the
//  complete OpenAPI spec as Markdown (renderOpenApiMarkdown — the same
//  renderer behind MCP's get_operation/search), every changelog entry and
//  blog post in full (not excerpts).
```

A theme wires these as two static routes: `app/llms.txt/route.ts` and
`app/llms-full.txt/route.ts`, both `export const dynamic = 'force-static'`
(Route Handlers are not cached by default in Next.js 16 — this content only
changes at build/deploy time) and `export const runtime = 'nodejs'` (the
content loaders use `fs`).

---

## 10. Theme toggle — `./theme-toggle` (file: `src/theme-toggle.tsx`)

```ts
export function ThemeToggle(props?: { className?: string }): ReactNode; // 'use client'
//  Toggles the `dark` class + data-theme on <html>, persists to localStorage,
//  defaults to prefers-color-scheme. Reads current state on mount (no flash).
export const themeInitScript: string;
//  A tiny IIFE string a theme injects in <head> (dangerouslySetInnerHTML) to set
//  the `dark` class before paint and avoid a flash of the wrong theme.
```

---

## 11. Styles & tokens — `./styles.css` (file: `src/styles.css`)

`:root` token defaults and `.dark` overrides, then structural CSS keyed off
the tokens for every class the kit emits. Themes override only the tokens.

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
`fw-response*`, `fw-apiref*` (incl. `fw-method-<verb>` pills, `fw-apiref-operation-id`,
`fw-playground*` / TryIt console classes), `fw-askai*` (incl. `fw-askai-source*`
for the ask-box's source links), `fw-theme-toggle`, `fw-search-*` (already
used by SearchDialog), `fw-reactions*`, `fw-comments*`, `fw-subscribe*`.

Dark theme: scope overrides under `html.dark` (the ThemeToggle toggles `dark` on
`<html>`).

---

## 12. The theme contract

A theme is a standalone Next.js 16 app that:
1. Has `content/docs/docs.json` + sample MDX + an `openapi.json` sample.
2. Imports `@inkform/framework/styles.css` once, then a `theme.css` that
   overrides the `--fw-*` tokens (its identity: colors, font, radius, density).
3. Routes `/[[...slug]]` (docs; `contentType="doc"`) and, when it has an
   OpenAPI tab, `/api-reference/[[...slug]]` (native renderer;
   `contentType="api"`) — resolving slug → MDX page or API operation, rendered
   via `<DocsShell>` + `<Sidebar>` + `<TocList>` + `<Mdx>` / `<OperationPage>`.
   `/blog`, `/blog/[slug]`, and `/changelog` follow the same pattern with
   `contentType="blog"` / `"changelog"`.
4. Builds the search index at build time (Pagefind, via a `postbuild` script),
   mounts `<SearchDialog>`, `<ThemeToggle>`,
   `<AskAi enabled={process.env.NEXT_PUBLIC_DOCS_AI_ENABLED === 'true'} />`.
5. Ships `/api/ask` (calls `askDocs()`, flag-gated), `/api/mcp`
   (`createMcpHandler()`), `app/llms.txt` + `app/llms-full.txt` (both
   `force-static`), `.env.example`, and a README with content + deploy guides.
6. `transpilePackages: ['@inkform/framework']` in `next.config.ts`.
7. Is `"private": true` with a unique workspace name `@inkform/theme-<name>`.

Themes differ by `theme.css` tokens + fonts + small layout accents — NOT by
re-implementing the shell, the routing, or any of the above.
