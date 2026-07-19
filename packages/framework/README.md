# @inkform/framework

The standalone Next.js + MDX rendering engine for **documentation, API
reference, blog, and changelog** sites. It's the core that powers the
[inkform docs themes](https://github.com/inkform-dev/framework) (Aurora,
Fern, Cedar, Mono) and the [`inkform-docs` CLI](https://github.com/inkform-dev/framework/tree/main/packages/cli)
— but it has **no backend, no database, and no product lock-in**. Point it at a
folder of MDX files and a `docs.json`, and you have a docs site you can deploy
anywhere Next.js runs (Vercel, AWS Amplify, a Node server, a container).

> Most people don't install this directly — they run
> `npx @inkform/cli init my-docs`, pick a theme, and get a ready-to-deploy
> project. This package is for building your own theme or wiring the engine into
> an existing Next.js app.

## What it gives you

- **MDX rendering** with GFM, `:::callout` directives, and Shiki syntax
  highlighting (`<Mdx>`).
- **A `docs.json` content model** — Mintlify-style tabs → groups → pages, with
  anchors, navbar links, nested pages, and versioning hints. Pure, no IO.
- **OpenAPI → API Reference** — parse a JSON/YAML spec into a normalized model,
  derive navigation from tags, and render endpoint pages with a "Try it"
  playground, cURL samples, and response schemas (`./openapi`, `./api-reference`).
- **A Mintlify-grade MDX component kit** — `Callout`/`Note`/`Tip`/`Warning`,
  `Card`/`CardGroup`, `Tabs`, `Steps`, `Accordion`, `CodeGroup`, `ParamField`,
  `ResponseField`, `Frame`, and more (`./components`).
- **A themeable layout shell** — `<DocsShell>`, `<Sidebar>`, `<TocList>`,
  `<Pagination>`, driven entirely by CSS variables so a theme is mostly tokens
  (`./docs-shell`).
- **Static, client-side search** (Cmd-K, [Pagefind](https://pagefind.app)) with
  `?q=` URL sync and destination-page term highlighting, and a
  **feature-flagged Ask-AI widget** (`./search-dialog`, `./pagefind-highlight`,
  `./ask-ai`) — see "Search (Pagefind)" below for the required postbuild step.
- **Standalone CSS** (`./styles.css`) — no Tailwind required in the host app.

## Install

```bash
npm install @inkform/framework
```

The package ships TypeScript source, so let Next.js transpile it:

```ts
// next.config.ts
const nextConfig = { transpilePackages: ['@inkform/framework'] };
export default nextConfig;
```

## Quick use

```tsx
// app/docs/[[...slug]]/page.tsx
import { loadDocsConfig, loadDocPage } from '@inkform/framework/content';
import { findDocPage } from '@inkform/framework/nav';
import { Mdx } from '@inkform/framework/mdx';
import '@inkform/framework/styles.css';

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const config = loadDocsConfig();
  const slug = (await params).slug?.join('/') ?? '';
  const meta = findDocPage(config!, slug || config!.navigation![0].pages[0].slug);
  const page = loadDocPage(meta!.file);
  return <Mdx source={page!.content} />;
}
```

Content lives under `content/{docs,blog,changelog}` (override the root with
`DOCS_CONTENT_ROOT`). The docs config is `content/docs/docs.json`.

## Subpath exports

| Export | What |
| --- | --- |
| `.` | nav model, slug redirects, OpenAPI types/helpers, `FRAMEWORK_VERSION` |
| `./content` | filesystem loaders: `loadDocsConfig`, `loadDocPage`, `loadBlogPosts`, `loadOpenApiSpec`, `extractHeadings` |
| `./nav` | `DocsConfig`, `docTabs`, `listDocPages`, `docNeighbours` |
| `./openapi` | `parseOpenApi`, `normalizeOperations`, `operationNavGroups`, `curlExample`, `sampleFromSchema` |
| `./mdx` | `<Mdx>` |
| `./components` | the MDX component kit + `mdxComponents()` |
| `./docs-shell` | `<DocsShell>`, `<Sidebar>`, `<TocList>`, `<Pagination>`, `<Breadcrumbs>` — also mounts the Pagefind highlight effect, see below |
| `./api-reference` | `<ApiReferenceView>`, `<ApiPlayground>` |
| `./search-dialog` | `<SearchDialog>` — Pagefind-backed Cmd-K palette, `?q=` URL sync |
| `./pagefind-highlight` | `<PagefindHighlightMount>` — highlights + scrolls to `?q=` terms on the destination page (already mounted by `<DocsShell>`; exposed for hosts with a custom shell) |
| `./ask-ai` | `<AskAi>` (feature-flagged AI assistant) |
| `./theme-toggle` | `<ThemeToggle>` |
| `./styles.css` | base structural CSS + design-token defaults |

## Search (Pagefind)

Search is [Pagefind](https://pagefind.app) — a static, client-side, WASM search
engine with no server component. It indexes your **built HTML output**, so
every consuming app needs a postbuild step:

```json
// package.json
{
  "scripts": {
    "build": "next build",
    "postbuild": "pagefind --site .next/server/app --output-path public/_pagefind"
  },
  "devDependencies": {
    "pagefind": "^1.5.0"
  }
}
```

`.next/server/app` is where Next.js writes fully-rendered static HTML for every
statically-generated route (this works even though these apps are NOT using
`output: 'export'` — they can't, because of the `/api/ask` route handler — as
long as every doc/blog/changelog route is covered by `generateStaticParams`).
Add `public/_pagefind/` to `.gitignore`; the index is a build artifact, not
source. `<DocsShell>` marks its content region with `data-pagefind-body` so
only real article content is indexed, not nav/sidebar/header chrome.

`<SearchDialog>` dynamically imports `/_pagefind/pagefind.js` at runtime (not
an npm dependency of the running app — the file is generated per-build) and
degrades gracefully — no crash, just an "index unavailable" message — if that
postbuild step hasn't run yet (e.g. `next dev`, or a consumer who forgot it).
Clicking a result carries the query to the destination as repeated `?q=`
params (one per word); `<PagefindHighlightMount>` (mounted inside `<DocsShell>`)
reads them with Pagefind's own `pagefind-highlight.js`, highlights each match,
and scrolls to the first one.
| `./subscribe-form` · `./analytics-script` · `./reactions` · `./comments` | optional, bring-your-own-backend widgets |

## Compatibility

`docs.json` is the standard config filename; a `inkform.json` of the same
shape is also read for backward compatibility, as is the legacy
`INKFORM_CONTENT_ROOT` env var.

## License

MIT. See [PUBLISHING.md](./PUBLISHING.md) for release + contribution notes.
