# inkform-docs

The framework's own documentation — dogfooded, built with `@inkform/framework`
itself, using the new **Galley** theme (Inkform's own design system). Covers
Getting Started, per-content-type guides (Docs, Blog, Changelog, Widgets,
interactive components), the full Framework API reference, the CLI
reference, and a Framework vs. Platform comparison. It also runs a real
`/blog` and `/changelog` about the framework's own development, proving out
the exact same routes every scaffolded project gets.

---

## Run locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Content structure

```
content/
  docs/
    docs.json                       # navigation, site name
    index.mdx                       # Introduction
    getting-started/
      index.mdx                     # landing page
      quickstart.mdx
      choosing-a-theme.mdx
      deploying.mdx
    guides/
      docs.mdx
      blog.mdx
      changelog.mdx
      widgets.mdx
      interactive.mdx               # comments, reactions, subscribe form
    reference/
      cli.mdx
      framework-api.mdx
    framework-vs-platform.mdx
  blog/                              # real posts about building the framework
  changelog/                         # real dated framework releases
```

### Adding pages

1. Create a `.mdx` file under `content/docs/`.
2. Add frontmatter: `title` and `description`.
3. Register the page in `docs.json` under the appropriate group.

No `openapi` tab is configured — the open-source framework has no REST API of
its own to document. (The hosted platform's own docs, at docs.inkform.dev,
point an `openapi` tab at the platform's real API.)

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | No | Production URL for canonical links |
| `NEXT_PUBLIC_DOCS_AI_ENABLED` | No | Set to `true` to enable the Ask AI widget |
| `ANTHROPIC_API_KEY` | Only if AI enabled | Used by `app/api/ask/route.ts` |

---

## Deploy to Vercel

1. Push to a GitHub repository.
2. Import the repo in the Vercel dashboard.
3. Set **Root directory** to the path of this folder if deploying from a monorepo.
4. Add `NEXT_PUBLIC_SITE_URL` as an environment variable (production target:
   `https://framework.inkform.dev`).
5. Click **Deploy**.
