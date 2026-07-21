# Canopy — @inkform/theme-canopy

Canopy is a light, spacious documentation theme built on `@inkform/framework`
— inspired by Mintlify's Sequoia starter kit. Light-first with an olive
accent, generous line-height and margins for long-form reading, Figtree
throughout (one confident sans voice, not a serif/sans split), IBM Plex Mono
for code. It supports Guides + API Reference tabs out of the box.

---

## Run locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

If this is a fresh clone, copy the env file first:

```bash
cp .env.example .env.local
# Edit NEXT_PUBLIC_SITE_URL if needed, then:
npm run dev
```

---

## Add content

All content lives in `content/docs/`.

### Navigation — `content/docs/docs.json`

`docs.json` controls the site name, logo, tabs, and page hierarchy:

```jsonc
{
  "name": "Your Docs",
  "tabs": [
    {
      "tab": "Guides",
      "navigation": [
        {
          "group": "Get Started",
          "pages": [
            { "title": "Introduction", "slug": "", "file": "index.mdx" },
            { "title": "Quickstart",   "slug": "quickstart", "file": "quickstart.mdx" }
          ]
        }
      ]
    },
    { "tab": "API Reference", "openapi": "openapi.json" }
  ]
}
```

- `slug` is the URL path (empty string = the index `/`).
- `file` is the MDX file path relative to `content/docs/`.
- The `openapi` field on a tab points to a JSON/YAML spec file in `content/docs/`.

### Writing MDX

Add `.mdx` files under `content/docs/` and register them in `docs.json`. Canopy
supports all built-in blocks: `<Note>`, `<Tip>`, `<Warning>`, `<Card>`,
`<CardGroup>`, `<Steps>`, `<Step>`, `<Tabs>`, `<Tab>`, `<CodeGroup>`,
`<Accordion>`, `<ParamField>`, `<Frame>`, and more.

### API Reference

Replace `content/docs/openapi.json` with your own OpenAPI 3.x spec (JSON or
YAML). The site auto-generates a sidebar and per-operation pages. No extra
configuration needed — just point the `openapi` tab field at your spec file.

### Blog and Changelog

Both ship wired and ready — `/blog` (list + post pages) and `/changelog`
(single dated list) render automatically once you add content:

```
content/
  blog/
    my-first-post.mdx    # frontmatter: title, date, author, tags, description
    series.json          # optional — group posts into a series
  changelog/
    2026-01-15-v1.mdx     # frontmatter: title, date, version
```

Both nav links only appear once at least one entry exists — an empty
`content/blog`/`content/changelog` (or no folder at all) keeps the top nav
clean and the pages still render a "no posts yet" state if visited directly.

---

## The AI tool menu

Canopy's signature feature (see the right rail on any doc page, below "On
this page") is `<AiToolMenu />` — a `@inkform/framework/ai-tool-menu` export,
built as a real shared framework component rather than something local to
this theme, so any other theme can use it too. It gives readers one-click
ways to hand the current page to an AI tool:

- **Copy page** — copies the page's raw Markdown to the clipboard.
- **Open in ChatGPT / Claude / Perplexity / Grok** — opens that tool with a
  prompt pre-filled to read the current page's URL.
- **Connect to Cursor / Connect to VS Code** — these don't open the doc page
  at all. They're MCP-install deep links (`cursor://…/mcp/install`,
  `vscode:mcp/install`) that register **this site's own MCP server** —
  `app/api/mcp/route.ts`, two lines around `createMcpHandler()` from
  `@inkform/framework/mcp` (see ARCHITECTURE.md §8) — in the reader's editor,
  so they can point their AI agent at these docs directly. This pattern was
  reverse-engineered from Sequoia's own production site (intercepting its
  `window.open` calls), not guessed.

It's wired into `app/[[...slug]]/page.tsx` and the API Reference overview
page via `DocsShell`'s `toc` slot, stacked underneath the normal `<TocList />`.
Icons are supplied via `renderAiToolIcon()` in `lib/icons.tsx` (generic Lucide
glyphs — chat bubble, sparkle, cursor, code brackets, search, bot — not
reproductions of any tool's actual logo). See the component's own doc comment
in `packages/framework/src/ai-tool-menu.tsx` for the full prop contract,
including how to disable the Cursor/VS Code items on a site that hasn't
mounted an MCP route (`mcpUrl={null}`).

---

## Maintain

### Slug redirects

When a page's URL changes, record the old → new slug mapping in
`content/docs/slug-history.json` to issue a 301 redirect:

```json
{
  "old-page-slug": "new-page-slug",
  "essentials/old-name": "essentials/new-name"
}
```

### Ask AI widget

The Ask AI button is built in but **disabled by default**. Enable it by setting
`NEXT_PUBLIC_DOCS_AI_ENABLED=true` in `.env.local`, plus `DOCS_AI_PROVIDER`
(`anthropic` | `openai` | `google`, default `anthropic`) and that provider's
API key (e.g. `ANTHROPIC_API_KEY`) — see `.env.example`. Answers are grounded
in this site's own content (`@inkform/framework/ai`'s `askDocs()`), not a
generic chatbot. This is a separate feature from the AI tool menu above — the
top-bar widget answers questions inline; the tool menu hands the page off to
an external AI tool of the reader's choice.

---

## Deploy to Vercel

1. Push this directory (or the whole monorepo) to a GitHub repository.
2. In the Vercel dashboard, click **Add New → Project** and import the repo.
3. **Framework preset**: Next.js.
4. **Root directory**: set to the path of this folder if deploying as a
   standalone (e.g. `templates/canopy`), or leave blank if deploying the
   directory itself.
5. Add the environment variable `NEXT_PUBLIC_SITE_URL` (your production URL,
   e.g. `https://docs.example.com`).
6. Click **Deploy**.

For a custom domain, go to **Settings → Domains** in your Vercel project and add
your domain. Vercel handles SSL automatically.

---

## Deploy to AWS Amplify

1. Connect the repo in the Amplify console.
2. Set the **Build settings** manually if auto-detection picks the wrong preset:
   - **Build command**: `npm ci && npm run build`
   - **Output directory**: `.next`
   - **Framework**: Next.js (SSR)
3. Add the `NEXT_PUBLIC_SITE_URL` environment variable under
   **Environment variables**.
4. Deploy. Amplify Hosting supports Next.js SSR/ISR natively since Gen 2.
