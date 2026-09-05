---
name: inkform-framework
description: Add MDX-powered docs, a blog, or a changelog to a Next.js site using @inkform/framework, then open a PR. Use when someone wants to add a blog or docs section to an existing Next.js app, scaffold a documentation site, render MDX content with frontmatter, build an API reference from an OpenAPI spec, or migrate markdown content into a site — e.g. "add a blog to this site", "set up docs for this project", "render these MDX files", or when pointed at framework.inkform.dev.
metadata:
  docs:
    - "https://framework.inkform.dev/getting-started/quickstart"
    - "https://framework.inkform.dev/guides/blog-in-existing-site"
    - "https://framework.inkform.dev/reference/framework-api"
  pathPatterns:
    - "next.config.*"
    - "content/**/*.mdx"
    - "content/**/docs.json"
---

# Add @inkform/framework to a Next.js site

`@inkform/framework` is a standalone Next.js + MDX renderer for docs, blogs, changelogs, and
OpenAPI reference. No account, no database, no platform dependency — content is MDX files in
the repo, read at build time.

## First, decide which job this is

| Situation | Do this |
|---|---|
| Greenfield — a whole new docs site | Scaffold with the CLI (§A) |
| Existing Next.js site, wants `/blog` or `/docs` added | Bolt on the two standalone pieces (§B) |

Getting this wrong is the main way this goes badly: **do not drop the full docs shell into
someone's existing marketing site.** They asked for a blog, not a theme transplant. §B keeps
their layout, header, footer, and design system untouched.

## Requirements — check before promising anything

```bash
grep -E '"next"|"react"' package.json
```

The framework peer-depends on **Next ≥ 16** and **React ≥ 19**. If the site is on Next 15 or
older, stop and tell the user plainly: this needs a Next major upgrade first, which is a
separate piece of work with its own risk. Do **not** quietly bump their Next major as a side
effect of "add a blog" — that is a large change they didn't ask for and can't easily review
inside a content PR.

## §A — Scaffold a new site

```bash
npx @inkform/cli@latest init my-docs --theme galley
cd my-docs && npm install && npm run dev
```

Themes: Aurora, Fern, Cedar, Mono, Base, Galley. Add `--openapi <path-or-url>` to generate an
API Reference tab from a spec. The CLI is non-destructive — pointed at a non-empty directory
it moves existing contents into `existing-contents/` rather than overwriting.

Pin `@inkform/framework` to `^0.3.0` or later. Earlier `^0.2.x` ranges were never published
and fail `npm install` with `ETARGET`.

## §B — Bolt onto an existing site

Two standalone pieces, nothing else:

- `@inkform/framework/content` — reads `content/blog/*.mdx` (frontmatter + body) at build time
- `@inkform/framework/mdx` — renders an MDX body to React, with syntax highlighting and the
  built-in blocks (`<Callout>`, `<Card>`, `<Steps>`, `<Tabs>`, `<CodeGroup>`, `<Accordion>`)

Skip `DocsShell`, the sidebar, search, and theme tokens — that's the full-docs-site layer.

### 1. Install and transpile

```bash
npm install @inkform/framework
```

**Merge** into the existing `next.config.ts` — don't replace the file:

```ts
const nextConfig: NextConfig = {
  // ...whatever is already here
  transpilePackages: ['@inkform/framework'],
};
```

The package ships TS/JSX source rather than compiled output, so Next has to transpile it.
Skipping this is the cause of most "unexpected token" build failures.

### 2. Content

MDX with frontmatter under `content/blog/`:

```mdx
---
title: Hello World
date: 2026-09-05
description: What this post is about.
tags: [engineering]
---

Body starts here.
```

### 3. Pages that match the host site

Write these in the site's **own** layout and components. The point is that a reader can't tell
the blog was bolted on.

```tsx
// app/blog/page.tsx
import Link from 'next/link';
import { loadBlogPosts } from '@inkform/framework/content';

export default async function BlogIndex() {
  const posts = await loadBlogPosts();
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.slug}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
          <time dateTime={post.date}>{post.date}</time>
        </li>
      ))}
    </ul>
  );
}
```

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { Mdx } from '@inkform/framework/mdx';
import { loadBlogPost } from '@inkform/framework/content';

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await loadBlogPost(slug);
  if (!post) notFound();
  return (
    <article>
      <h1>{post.title}</h1>
      <Mdx source={post.body} />
    </article>
  );
}
```

Import `@inkform/framework/styles.css` only if you want the framework's content styling. On a
site with its own design system, prefer styling the output yourself.

### Docs sites use `docs.json`

For a docs section, navigation is declared in `content/docs/docs.json`, independent of where
files sit on disk:

```jsonc
{
  "name": "My Docs",
  "navigation": [
    {
      "group": "Get Started",
      "pages": [{ "title": "Introduction", "slug": "introduction", "file": "introduction.mdx" }]
    }
  ]
}
```

Rename a slug and the framework 301-redirects the old URL, so published links keep working.
Every page must be registered here — a file on disk that isn't in `docs.json` won't route.

## Verify before opening the PR

```bash
npx tsc --noEmit
npm run build
```

Both must pass, and the new routes must appear in the build's route list. If the build
rewrites `tsconfig.json` as a side effect, revert it — unrelated churn doesn't belong in the
PR. Check `git status` and stage deliberately; don't sweep up lockfile noise you didn't mean
to change.

## Open the PR

Branch off the repo's default branch, and confirm the remote is the repo the team actually
uses (`git remote -v`, `gh repo view --json owner,name`) — a stale clone can point at a
renamed repo or a fork.

State in the PR body: what routes were added, that the site's own layout is untouched, the
Next/React requirement, and anything the reviewer must do (add content, set a nav entry).

## Things to get right

- **`transpilePackages` is not optional.** Omitting it is the single most common failure.
- **Don't replace `next.config.ts`** — merge the one key in.
- **Don't adopt the docs shell on an existing site** unless the user asked for a docs site.
- **Content is build-time.** New posts need a rebuild (or ISR) to appear — don't describe it
  as live-editable, and don't reach for the platform API unless the content genuinely lives
  in a different repo.
- **The framework is standalone.** It needs no Inkform account. If someone wants the hosted
  editor, subscribers, or newsletter on top, that's the platform — see
  `docs.inkform.dev`, and the `inkform-newsletter` skill for signup forms.
