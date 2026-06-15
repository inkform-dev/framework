# Fern — @freewrite-cms/theme-fern

Fern is a clean, friendly documentation theme built on
`@freewrite-cms/framework`. Light-first with an emerald-green accent, Inter for
prose, and JetBrains Mono for code. Rounded corners and green-tinted surfaces
give it a warm, approachable feel. Supports Guides + API Reference tabs out of
the box.

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

Add `.mdx` files under `content/docs/` and register them in `docs.json`. Fern
supports all built-in blocks: `<Note>`, `<Tip>`, `<Warning>`, `<Card>`,
`<CardGroup>`, `<Steps>`, `<Step>`, `<Tabs>`, `<Tab>`, `<CodeGroup>`,
`<Accordion>`, `<ParamField>`, `<Frame>`, and more.

### API Reference

Replace `content/docs/openapi.json` with your own OpenAPI 3.x spec (JSON or
YAML). The site auto-generates a sidebar and per-operation pages. No extra
configuration needed — just point the `openapi` tab field at your spec file.

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
`NEXT_PUBLIC_DOCS_AI_ENABLED=true` in `.env.local`. Wire up a real LLM provider
in `app/api/ask/route.ts` (see the TODO comment there; currently returns a stub).

---

## Deploy to Vercel

1. Push this directory (or the whole monorepo) to a GitHub repository.
2. In the Vercel dashboard, click **Add New → Project** and import the repo.
3. **Framework preset**: Next.js.
4. **Root directory**: set to the path of this folder if deploying as a
   standalone (e.g. `oss/templates/fern`), or leave blank if deploying the
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

---

## Ask AI (deferred)

The `<AskAi />` widget in the top bar is built in. To activate it:

1. Set `NEXT_PUBLIC_DOCS_AI_ENABLED=true`.
2. Implement the LLM call in `app/api/ask/route.ts`.
3. Add `ANTHROPIC_API_KEY` (or your provider key) as a server-side env var.

The widget renders in both enabled and disabled states — it just shows an
informational notice when disabled.
