# Feather — @inkform/theme-feather

Feather is a light, airy documentation theme built on `@inkform/framework`
— inspired by Mintlify's own Luma starter kit. Light-mode-forward with a
warm peach/coral accent, generous whitespace, and low visual weight (thin
borders, soft shadows). Plus Jakarta Sans throughout (one confident sans
voice, not a serif/sans split), IBM Plex Mono for code. It supports
Guides + API Reference tabs out of the box, plus a third "Resources"
dropdown tab (Changelog / Blog / Community) in the top nav.

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

### The "Resources" dropdown tab

Unlike Guides and API Reference, the third top-nav tab ("Resources") is
**not** driven by `docs.json` — it's a small, hand-built dropdown in
`components/resources-dropdown.tsx` linking to `/changelog`, `/blog`, and a
community URL. `nav.ts`'s `DocsTab` model only supports plain-link or
OpenAPI tabs, not a dropdown, so this stays a per-theme UI construct rather
than a new framework concept — edit the `RESOURCES_ITEMS` array in that file
to change its links, labels, or icons.

### Writing MDX

Add `.mdx` files under `content/docs/` and register them in `docs.json`. Feather
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

The homepage's "Resources" teaser section and the Resources dropdown tab
both link to `/blog` and `/changelog` regardless of whether content exists
yet — unlike the standard `navbarLinks` auto-add behavior, they render a
"no posts yet" state rather than disappearing, since they're fixed UI
rather than conditional nav links.

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
generic chatbot.

---

## Deploy to Vercel

1. Push this directory (or the whole monorepo) to a GitHub repository.
2. In the Vercel dashboard, click **Add New → Project** and import the repo.
3. **Framework preset**: Next.js.
4. **Root directory**: set to the path of this folder if deploying as a
   standalone (e.g. `templates/feather`), or leave blank if deploying the
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
