# Astro docs example

An Astro 7 app that serves Inkform docs under `/docs` with
[`@inkform/astro`](../../packages/astro). It's shaped like a real host: its
home page (`src/pages/index.astro`) is its own, rendered on demand with a React
island; it runs with `output: 'server'` and the Node adapter; and Astro's
`security.csp` is on.

```bash
npm run dev --workspace=@inkform/example-astro-docs        # http://localhost:4321/docs
npm run build --workspace=@inkform/example-astro-docs
npm run start --workspace=@inkform/example-astro-docs      # serves the build
npm run test:e2e --workspace=@inkform/example-astro-docs   # Playwright: builds, serves, tests
```

- `content/docs/` holds `docs.json`, the pages and `openapi.json`.
  [`essentials/components.mdx`](./content/docs/essentials/components.mdx) uses
  every component in the kit.
- `content/blog/` and `content/changelog/` turn on `/docs/blog` and
  `/docs/changelog`.
- [`e2e/docs.spec.ts`](./e2e/docs.spec.ts) checks that every page renders with
  no CSP violation, that tabs, code groups, accordions, the TOC, the theme
  toggle, the drawer, diagrams, the API sample pickers and Try It work, that
  search finds pages, and that the docs pages load no React.

`cookie` is a direct dependency only because of this monorepo's hoisting:
another workspace puts an older `cookie` at the root, where Astro's server
build would find it. A standalone app doesn't need it.
