# @inkform/astro

Serve an Inkform content folder from any Astro 7 site: docs pages from
`docs.json` and MDX, the API Reference from an OpenAPI spec, a blog and a
changelog, `llms.txt`, and Pagefind search. Everything lives under one base
path (`/docs` by default), so the rest of the site stays yours.

The pages are the same as the Next.js themes': the MDX goes through
[`@inkform/framework`](../framework)'s pipeline and component kit, styled by
its `fw-*` classes and `--fw-*` tokens. React renders that kit at build time;
the browser gets plain HTML and a few small scripts, and no React.

## What it adds

| Route | What |
| --- | --- |
| `<base>` and `<base>/<slug>` | Every page listed in `content/docs/docs.json` |
| `<base>/<api-tab>` and `<base>/<api-tab>/operations/<operationId>` | The API Reference, when a docs.json tab has `openapi` (`<api-tab>` is the tab's label, slugified: `api-reference`) |
| `<base>/blog`, `<base>/blog/<slug>` | When `content/blog/` has published posts |
| `<base>/changelog` | When `content/changelog/` has entries |
| `<base>/llms.txt`, `<base>/llms-full.txt` | The [llms.txt](https://llmstxt.org) index (its links match the pages', `base` and trailing slash included) and the full corpus |
| `<base>/_pagefind/` | The search index, written after `astro build` |

Every route is prerendered, including in an `output: 'server'` app, so the
pages are static files a CDN serves and Pagefind can index.

## Requirements

- Astro 7 and Node.js 22.23 or later.
- `react` and `react-dom` 19 in the site. They run at build time only, to
  render the framework's components; you don't need `@astrojs/react`.
- `mermaid`, only if you turn on the `mermaid` option.

## Install

```bash
npm install @inkform/astro react react-dom
```

```ts
// astro.config.ts
import { defineConfig } from 'astro/config';
import inkform from '@inkform/astro';

export default defineConfig({
  integrations: [
    inkform({
      base: '/docs',
      contentRoot: './content',
    }),
  ],
});
```

Then add `content/docs/docs.json` and your pages. The content format is the
framework's, unchanged: see
[ARCHITECTURE.md §1](../framework/ARCHITECTURE.md#1-content-model). A content
folder made for a Next.js theme works as it is.

```
content/
  docs/
    docs.json
    openapi.json        # optional, named by a docs.json tab
    index.mdx
    quickstart.mdx
  blog/                 # optional
  changelog/            # optional
```

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `base` | `'/docs'` | Where the routes are mounted. `'/'` makes the docs the whole site. |
| `publicBase` | `base` | The path prefix readers see in links, when something in front of the site serves the docs from another place (see [Host mode](#serve-the-docs-from-their-own-host)). Astro's own `base` is added for you. |
| `contentRoot` | `'./content'` | The folder holding `docs/docs.json`, relative to the project root. |
| `theme` | `'galley'` | `'galley'`, `'plain'` (the framework's neutral tokens), or a path to your own CSS file of `--fw-*` overrides. |
| `customCss` | `[]` | More CSS files to load on docs pages, after the theme. |
| `components` | none | A module of your own MDX components, relative to the project root (see [Your own components](#your-own-components)). |
| `search` | `true` | Build a Pagefind index after `astro build` and show the search dialog. |
| `mermaid` | `false` | Draw ```` ```mermaid ```` fences as diagrams in the browser. Needs `npm install mermaid`. Off, they show their source. |
| `llmsTxt` | `true` | Serve `llms.txt` and `llms-full.txt`. |

## Components

Every component in the framework's kit works in MDX without imports: `Callout`,
`Note`, `Tip`, `Info`, `Warning`, `Danger`, `Check`, `:::info` style callouts,
`Card`, `CardGroup`, `Columns`, `Steps`, `Step`, `Tabs`, `Tab`, `Accordion`,
`AccordionGroup`, `CodeGroup`, `ParamField`, `ResponseField`, `Expandable`,
`Frame`, `Tooltip`, `Embed`, `Mermaid`, `ApiLink`, `ApiReference`, `Hero`,
`AuthorBio`, `RelatedPosts`, `NewsletterCTA`, `Playground`. A component the kit
doesn't have renders as a visible marker instead of failing the build.

The interactive ones are rendered in full on the server (every tab panel,
every code sample) and switched by small scripts in the browser, so readers
without JavaScript, search and view-source see all of it. Accordions and
`Expandable` are `<details>` elements and need no script at all.

`<ApiLink operationId="…">` links to that operation's page and fails the
build if the operation doesn't exist.

### Your own components

Point `components` at a module, and every export whose name starts with a
capital letter works in MDX without imports, next to the kit's components:

```ts
inkform({
  components: './src/mdx-components.tsx',
  customCss: ['./src/styles/docs.css'], // styles for them, if they need any
});
```

```tsx
// src/mdx-components.tsx
import { Frame } from '@inkform/framework/components';

export function Screenshot({ file, caption }: { file: string; caption: string }) {
  return (
    <Frame caption={caption}>
      <img src={`/screenshots/${file}`} alt={caption} />
    </Frame>
  );
}
```

```mdx
<Screenshot file="create-app.png" caption="Create the app." />
```

- They are React components, rendered to HTML at build time like the kit.
  Props and children work; state and effects don't run in the browser.
- A name the kit also has (`Frame`, `Card`) replaces the kit's component on
  every page.
- `export default { Screenshot }` works too. Exports that aren't components
  (helpers, constants) are ignored.
- The kit's components are exported from `@inkform/framework/components`,
  which `@inkform/astro` installs, so yours can wrap them. With a strict
  package manager (pnpm), add `@inkform/framework` to your dependencies.
- A `.tsx` or `.jsx` module works without `@astrojs/react`: when the site has
  no UI framework integration, the integration has Vite compile JSX for
  React. With Preact, Solid or Vue installed, those compile JSX instead, so
  write the module with `createElement` from `react` in a `.ts` file. For
  type checking, set `"jsx": "react-jsx"` and `"jsxImportSource": "react"`
  in `tsconfig.json`.
- Image `src`s and links they render get Astro's `base` like the rest of the
  content.

Links in content written from the site root, the way content for a Next.js
theme is (`[Quickstart](/quickstart)`), get the docs base added when they point
at a docs page. See [Astro's `base` and `trailingSlash`](#astros-base-and-trailingslash)
for the rest.

## Astro's `base` and `trailingSlash`

Write links from the site root, as if the site were served from `/`, and the
integration writes them for wherever it is served. With
`base: '/my-project'` and `trailingSlash: 'always'` in `astro.config`, and the
docs at `/docs`:

| Written in docs.json or MDX | Becomes |
| --- | --- |
| `/quickstart` or `/docs/quickstart` (a docs page) | `/my-project/docs/quickstart/` |
| `/` (the site's home) | `/my-project/` |
| `/pricing`, `/screenshots/setup.png` (anything else on the site) | `/my-project/pricing`, `/my-project/screenshots/setup.png` |
| `https://…`, `//cdn…`, `#section`, `../relative` | unchanged |

This covers docs.json's `navbarLinks`, `anchors`, `cta`, `logo`, `favicon` and
sidebar entries with an `href`, links and images in MDX, and the sidebar,
breadcrumbs, prev/next, search results and `llms.txt`. A link that already
starts with Astro's base is left alone. Docs-page links end in a slash when
`trailingSlash` is `'always'`; other paths keep the slash you wrote, since
they may be files.

## Theming

A theme is a CSS file that overrides the framework's `--fw-*` tokens. The
default, `galley`, is Inkform's warm paper and ink with a proof-red accent,
ported from [`templates/galley`](../../templates/galley). `plain` keeps the
framework's neutral defaults.

Your own theme:

```ts
inkform({ theme: './src/styles/docs-theme.css' });
```

```css
/* src/styles/docs-theme.css */
:root {
  --fw-primary: #0f766e;
  --fw-font: 'Inter Variable', system-ui, sans-serif;
  --fw-radius: 8px;
}
html.dark {
  --fw-bg: #0b1210;
  --fw-primary: #2dd4bf;
}
```

The full token list is in §11 of the framework's
[ARCHITECTURE.md](../framework/ARCHITECTURE.md).
Dark mode is the `dark` class on `<html>`, set before first paint and saved in
`localStorage['fw-theme']`, as in the Next.js themes.

The sidebar's group names and the "On this page" title are small tracked
capitals, as in the Next.js themes. Three variables change that, for example
to sentence case:

```css
:root {
  --fw-label-transform: none;        /* default: uppercase */
  --fw-label-letter-spacing: normal; /* default: 0.07em */
  --fw-label-font-size: 0.8125rem;   /* default: 0.7rem */
}
```

On screens 40rem wide and under, the header keeps one row: the tabs and
navbar links move to the menu drawer, the ⌘K hint is hidden, and a long site
name is cut with an ellipsis. Galley keeps its row of tabs under the logo.

Galley names General Sans, Newsreader and JetBrains Mono but loads none of
them, so nothing is fetched from a font CDN. To use them, add `@font-face`
rules through `customCss` (for example from `@fontsource-variable/newsreader`).

The docs CSS is imported by the docs pages only. Astro links it on those pages
and nowhere else, so it never reaches the rest of the site, and the site's own
CSS (Tailwind or anything else) isn't loaded on the docs pages unless you add
it with `customCss`.

## Search

`astro build` prerenders the docs, then Pagefind indexes each page's article
(`[data-pagefind-body]`, not the navigation) and writes the index to
`<base>/_pagefind/` in the build output. The dialog opens with the Search
button, ⌘K or Ctrl+K, or a `?q=` in the URL; a result opens with its words
highlighted. In `astro dev` there is no index yet, and the dialog says so.

## Content Security Policy

The docs pages work under Astro's `security.csp`:

- No inline event handlers. Every script is a module Astro bundles and hashes.
- The two inline elements a page has, the script that sets dark mode before
  paint and one `<style>` holding the page's syntax colors, register their
  hashes through `Astro.csp`.
- Shiki and a few components write `style="…"` attributes, which a policy
  without `'unsafe-inline'` blocks. The integration moves them into that one
  hashed `<style>` element, so code keeps its colors.

Some things need more than hashes, and the docs pages add them to their own
policy only, never the rest of the site:

| On | Adds | Why |
| --- | --- | --- |
| Every docs page, when `search` is on | `script-src 'self' 'wasm-unsafe-eval'` | Pagefind compiles WebAssembly. |
| Pages with a Mermaid diagram | `style-src 'self' 'unsafe-inline'` | Mermaid's SVG carries its own `<style>` and style attributes. |

Two things are yours to allow, because only you know the hosts:

- **Try It** sends requests from the browser to your API, so add its origin to
  `connect-src` (for example `connect-src 'self' https://api.example.com`).
- **`<Embed>`** iframes need their host in `frame-src`.

## Host apps

The integration adds routes under `base` and nothing else: no middleware, no
changes to `/`, no global CSS or scripts on the site's own pages. It works in
`output: 'static'` and `output: 'server'` apps.

### Middleware

If the site has middleware that routes or rewrites requests, let `<base>/*`
through untouched. In a production build the docs are static files, which
Vercel and the Node adapter serve before the app's middleware runs; in
`astro dev` every request goes through it.

### Serve the docs from their own host

To put the docs on `docs.example.com` while the app keeps the `/docs` routes,
map the host onto the path in front of the site, and tell the integration
which prefix readers see:

```ts
inkform({
  base: '/docs',
  // '' on the docs host, '/docs' on the main host.
  publicBase: process.env.DOCS_HOST_MODE === 'hosts' ? '' : '/docs',
});
```

Because the pages are prerendered, the mapping has to reach the static files:
a platform rewrite (`docs.example.com/:path*` → `/docs/:path*`), or middleware
that fetches `/docs/<path>` for requests on the docs host. A middleware
`rewrite()` to a prerendered route doesn't work in production, since
prerendered pages aren't in the server build. The simplest setup keeps `/docs`
in the URL on the docs host too (`publicBase: '/docs'`, the default) and only
redirects `docs.example.com/` to `/docs`.

## Deploy on Vercel

```ts
// astro.config.ts
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [inkform({ base: '/docs' })],
});
```

The docs pages and the search index end up in `.vercel/output/static/` and are
served from Vercel's CDN; the rest of the app runs as functions as before.
Nothing else to configure. `@astrojs/node` works the same way (the example
uses it): the docs are static files in the client output.

The pages are prerendered in Node, reading the content folder from disk, so
the build has to run in Node, as it does with these two adapters.

## How it works

- `injectRoute` adds one prerendered route, `<base>/[...slug]`, whose
  `getStaticPaths` reads docs.json, the spec, and the blog and changelog
  folders (plus two endpoints for `llms.txt`). Two sources claiming one URL
  fail the build with both names.
- MDX is compiled with the framework's own pipeline (`compileMdx` from
  `@inkform/framework/mdx-options`: GFM, `:::` callouts, heading ids, Shiki via
  rehype-pretty-code, Mermaid fences) and rendered with `react-dom/static`. API
  operation pages are the framework's `OperationPage`, rendered the same way.
- The shell (header, sidebar, TOC, pagination, breadcrumbs) is Astro
  components with the framework's markup and classes.
- Scripts in the browser: the drawer, theme toggle and TOC highlight; tabs and
  code groups; search; the API sample pickers and Try It; diagrams. Each page
  loads only the ones it uses.
- `@inkform/framework` and this package ship TypeScript source, which Astro
  compiles. Nothing to configure.

## Known limits

- One docs site per Astro project: the framework's content loaders read one
  content folder.
- docs.json icon names aren't drawn; the framework ships no icon set, so they
  render as its small placeholder, as in the Next.js themes.
- No Ask AI box and no MCP route. Both need a server route with an API key;
  the framework's `@inkform/framework/ai` and `/mcp` work in an Astro API route
  if you want them.
- A code block title is `title="…"` in the fence's meta (```` ```bash title="npm" ````),
  as rehype-pretty-code reads it.

## Develop in this repo

```bash
npm install
npm test --workspace=@inkform/astro          # unit tests
npm run build --workspace=@inkform/example-astro-docs
npm run test:e2e --workspace=@inkform/example-astro-docs   # Playwright, builds the example first
```

[`examples/astro-docs`](../../examples/astro-docs) is a host app with its own
home page, a React island, Astro's CSP on, and every component on one page.
