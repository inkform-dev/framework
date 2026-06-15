<div align="center">

# freewrite-docs

**Open-source documentation framework for Next.js.** Beautiful docs, API
reference from OpenAPI, blog, and changelog — from a folder of Markdown.

`npx @freewrite-cms/cli@latest init my-docs`

</div>

---

This is a monorepo. It contains:

| Package | What it is |
| --- | --- |
| [`packages/framework`](./packages/framework) | `@freewrite-cms/framework` — the MDX + OpenAPI rendering engine |
| [`packages/cli`](./packages/cli) | `@freewrite-cms/cli` — `npx` scaffolder (pick a theme, get a project) |
| [`templates/aurora`](./templates/aurora) | classic dark docs theme |
| [`templates/fern`](./templates/fern) | clean, friendly green theme with Guides / API tabs |
| [`templates/cedar`](./templates/cedar) | warm, editorial theme |
| [`templates/mono`](./templates/mono) | monospace / brutalist theme |
| [`templates/base`](./templates/base) | minimal, unopinionated starter |
| [`examples/pokeapi-docs`](./examples/pokeapi-docs) | a full docs site for the PokéAPI |
| [`examples/markdown-docs`](./examples/markdown-docs) | a full docs site about Markdown |

## Why freewrite-docs

- **Markdown in, polished docs out.** Write MDX, commit it, deploy. No CMS, no
  database, no build service — your repo is the source of truth.
- **API reference is OpenAPI-first.** Point `docs.json` at an OpenAPI spec and
  you get a searchable, paginated, "Try it"-enabled API reference automatically.
  Everything else is MDX. (This is the standard — the way Mintlify does it.)
- **Themes you actually choose between.** Four production themes that look
  nothing alike, plus a minimal base — all driven by the same engine, so you can
  switch with a token file.
- **Own your deployment.** It's a normal Next.js app. Ship it to Vercel, AWS
  Amplify, a container, or under a path on a site you already run.
- **Genuinely open.** MIT, no telemetry, no required account, no lock-in.

## Get started

```bash
npx @freewrite-cms/cli@latest init my-docs
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
npm run dev --workspace=@freewrite-cms/example-pokeapi   # run an example
```

## License

MIT.
