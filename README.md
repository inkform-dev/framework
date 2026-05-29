# @freewrite-cms/framework

The open-source rendering framework for the Freewrite CMS ecosystem — a Next.js
16 + MDX renderer for **changelogs, blogs, and documentation**. It reads the same
`freewrite.json` / `series.json` / `slug-history.json` files the Freewrite CMS
editor commits to your repo, so "publish in the CMS" and "render on your site"
use one content contract. No database — the MDX files in your repo are the content.

## Install

```bash
npm install @freewrite-cms/framework
```

Next.js must transpile the package (it currently ships TypeScript source):

```ts
// next.config.ts
const nextConfig = { transpilePackages: ['@freewrite-cms/framework'] };
```

## Use

```tsx
import { loadBlogPosts, loadBlogPost } from '@freewrite-cms/framework/content';
import { Mdx } from '@freewrite-cms/framework/mdx';
import '@freewrite-cms/framework/styles.css';

export default async function Post({ params }) {
  const post = loadBlogPost((await params).slug);
  return <Mdx source={post.content} />;
}
```

Content lives under `content/{blog,docs,changelog}` (override the root with
`FREEWRITE_CONTENT_ROOT`). Subpath exports: `./content`, `./mdx`, `./components`,
`./nav`, `./search`, `./search-dialog`, `./subscribe-form`, `./analytics-script`,
`./styles.css`.

Two ways to consume Freewrite content:
- **Full site (pattern B):** this framework + filesystem MDX (the starter templates).
- **Embed in an existing app (pattern A):** fetch the hosted REST API
  (`/api/v1/*`) and render the returned MDX with `<Mdx>`.

## Publishing / contributing

See [PUBLISHING.md](./PUBLISHING.md). MIT licensed.
