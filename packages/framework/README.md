# @freewrite-cms/framework

The standalone Next.js + MDX rendering engine for **documentation, API
reference, blog, and changelog** sites. It's the core that powers the
[freewrite-cms docs themes](https://github.com/freewrite-cms/framework) (Aurora,
Fern, Cedar, Mono) and the [`freewrite-docs` CLI](https://github.com/freewrite-cms/framework/tree/main/packages/cli)
— but it has **no backend, no database, and no product lock-in**. Point it at a
folder of MDX files and a `docs.json`, and you have a docs site you can deploy
anywhere Next.js runs (Vercel, AWS Amplify, a Node server, a container).

> Most people don't install this directly — they run
> `npx @freewrite-cms/cli init my-docs`, pick a theme, and get a ready-to-deploy
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
- **Client-side search** (Cmd-K, fuse.js) and a **feature-flagged Ask-AI widget**
  (`./search-dialog`, `./ask-ai`).
- **Standalone CSS** (`./styles.css`) — no Tailwind required in the host app.

## Install

```bash
npm install @freewrite-cms/framework
```

The package ships TypeScript source, so let Next.js transpile it:

```ts
// next.config.ts
const nextConfig = { transpilePackages: ['@freewrite-cms/framework'] };
export default nextConfig;
```

## Quick use

```tsx
// app/docs/[[...slug]]/page.tsx
import { loadDocsConfig, loadDocPage } from '@freewrite-cms/framework/content';
import { findDocPage } from '@freewrite-cms/framework/nav';
import { Mdx } from '@freewrite-cms/framework/mdx';
import '@freewrite-cms/framework/styles.css';

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
| `.` | nav model, search index builder, slug redirects, OpenAPI types/helpers, `FRAMEWORK_VERSION` |
| `./content` | filesystem loaders: `loadDocsConfig`, `loadDocPage`, `loadBlogPosts`, `loadOpenApiSpec`, `extractHeadings` |
| `./nav` | `DocsConfig`, `docTabs`, `listDocPages`, `docNeighbours` |
| `./openapi` | `parseOpenApi`, `normalizeOperations`, `operationNavGroups`, `curlExample`, `sampleFromSchema` |
| `./mdx` | `<Mdx>` |
| `./components` | the MDX component kit + `mdxComponents()` |
| `./docs-shell` | `<DocsShell>`, `<Sidebar>`, `<TocList>`, `<Pagination>`, `<Breadcrumbs>` |
| `./api-reference` | `<ApiReferenceView>`, `<ApiPlayground>` |
| `./search` · `./search-dialog` | search index + Cmd-K dialog |
| `./ask-ai` | `<AskAi>` (feature-flagged AI assistant) |
| `./theme-toggle` | `<ThemeToggle>` |
| `./styles.css` | base structural CSS + design-token defaults |
| `./subscribe-form` · `./analytics-script` · `./reactions` · `./comments` | optional, bring-your-own-backend widgets |

## Compatibility

`docs.json` is the standard config filename; a `freewrite.json` of the same
shape is also read for backward compatibility, as is the legacy
`FREEWRITE_CONTENT_ROOT` env var.

## License

MIT. See [PUBLISHING.md](./PUBLISHING.md) for release + contribution notes.
