<div align="center">

# inkform-docs

**Open-source documentation framework for Next.js.** Beautiful docs, API
reference from OpenAPI, blog, and changelog — from a folder of Markdown.

`npx @inkform/cli@latest init my-docs`

</div>

---

This is a monorepo. It contains:

| Package | What it is |
| --- | --- |
| [`packages/framework`](./packages/framework) | `@inkform/framework` — the MDX + OpenAPI rendering engine |
| [`packages/cli`](./packages/cli) | `@inkform/cli` — `npx` scaffolder (pick a theme, get a project) |
| [`templates/aurora`](./templates/aurora) | classic dark docs theme |
| [`templates/fern`](./templates/fern) | clean, friendly green theme with Guides / API tabs |
| [`templates/cedar`](./templates/cedar) | warm, editorial theme |
| [`templates/mono`](./templates/mono) | monospace / brutalist theme |
| [`templates/base`](./templates/base) | minimal, unopinionated starter |
| [`templates/galley`](./templates/galley) | Inkform's own design system — warm paper + ink, one editorial red accent |
| [`examples/pokeapi-docs`](./examples/pokeapi-docs) | a full docs site for the PokéAPI |
| [`examples/markdown-docs`](./examples/markdown-docs) | a full docs site about Markdown |
| [`examples/inkform-docs`](./examples/inkform-docs) | the framework's own docs — dogfooded with the Galley theme |

## Why inkform-docs

- **Markdown in, polished docs out.** Write MDX, commit it, deploy. No CMS, no
  database, no build service — your repo is the source of truth.
- **API reference is OpenAPI-first — and framework-native.** Point `docs.json`
  at an OpenAPI spec and you get a searchable, paginated, "Try it"-enabled API
  reference automatically. Rendered with the framework's own React
  components — **zero Scalar/Vue dependency**, real per-operation pages
  (SSG'd, not a client-side SPA embed), a real Try It console that makes
  actual requests. Everything else is MDX.
- **Your docs are an MCP server.** Ship `/api/mcp` and every page — guides and
  API operations alike — becomes callable by Claude, Cursor, or any MCP
  client: `search`, `get_operation`, `list_operations`, `get_doc`. Self-hosted,
  no external platform, no billing — it's just another Next.js route handler.
- **An AI ask-box grounded in your actual content**, not a hosted black box.
  BYO model (Anthropic, OpenAI, or Google) and BYO API key; retrieval reuses
  the same search the MCP server exposes, so the answers and the sources it
  cites both trace back to real pages.
- **`/llms.txt` and `/llms-full.txt` out of the box** — the emerging
  convention ([llmstxt.org](https://llmstxt.org)) for giving LLMs a plain-text
  entry point into your content without crawling HTML.
- **Themes you actually choose between.** Five production themes that look
  nothing alike, plus a minimal base — all driven by the same engine, so you can
  switch with a token file.
- **Own your deployment.** It's a normal Next.js app. Ship it to Vercel, AWS
  Amplify, a container, or under a path on a site you already run.
- **Genuinely open.** MIT, no telemetry, no required account, no lock-in.

## Get started

```bash
npx @inkform/cli@latest init my-docs
cd my-docs
npm install
npm run dev
```

The CLI asks for a project folder and a theme, then writes a standalone Next.js
project with a README that walks you through adding content and deploying.

To build your own theme or embed the engine in an existing app, see
[`packages/framework`](./packages/framework).

## Develop in this repo

```bash
npm install          # installs all workspaces
npm run typecheck    # typecheck every package
npm run dev --workspace=@inkform/example-pokeapi   # run an example
```

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md). Upgrading from an existing `docs.json`
and want to know what changed? See [`MIGRATION.md`](./MIGRATION.md).

## License

MIT.
