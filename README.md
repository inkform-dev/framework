<div align="center">

# inkform-docs

**Open-source documentation framework for Next.js.**

Beautiful docs, native API reference from OpenAPI, blog, and changelog — from a folder of Markdown.

<br />

[![CI](https://github.com/inkform-dev/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/inkform-dev/framework/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](./package.json)

```bash
npx @inkform/cli@latest init my-docs
```

[Get started](#get-started) · [Themes](#themes) · [Features](#features) · [Develop](#develop-in-this-repo) · [Contributing](./CONTRIBUTING.md)

</div>

---

## What is inkform-docs?

**inkform-docs** is a self-hosted documentation framework. You write MDX, configure navigation in a single `docs.json` file, and deploy a normal Next.js app. No CMS, no database, no vendor lock-in.

The engine (`@inkform/framework`) handles rendering, search, OpenAPI parsing, and optional AI/MCP integrations. Themes are thin Next.js apps that restyle the engine with CSS tokens. The CLI scaffolds a ready-to-deploy project in one command.

```
┌─────────────────────────────────────────────────────────┐
│  Your content (MDX + docs.json + openapi.json)          │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  @inkform/framework — MDX, OpenAPI, search, MCP, AI     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Theme (Canopy / Shadcn / Galley) — tokens + layout     │
└──────────────────────────┬──────────────────────────────┘
                           │
                    Next.js 16 app → deploy anywhere
```

## Get started

**Prerequisites:** [Node.js 22+](https://nodejs.org/) and npm.

```bash
npx @inkform/cli@latest init my-docs
cd my-docs
npm install
npm run dev        # → http://localhost:3000
```

The CLI prompts for a project folder and a theme, then writes a standalone Next.js project. Edit `content/docs/` to add pages, update `content/docs/docs.json` for navigation, and run `npm run build` when you're ready to deploy.

**CLI options:**

```bash
npx @inkform/cli@latest init my-docs --theme galley          # skip theme prompt
npx @inkform/cli@latest init my-docs --openapi ./spec.yaml   # wire up API reference
npx @inkform/cli@latest init my-docs -y                        # accept defaults
```

The binary is also available as `inkform-docs` when installed globally.

To embed the engine in an existing Next.js app or build a custom theme from scratch, see [`packages/framework`](./packages/framework) and [`packages/framework/ARCHITECTURE.md`](./packages/framework/ARCHITECTURE.md).

## Features

| | |
| --- | --- |
| **Markdown in, polished docs out** | Write MDX, commit it, deploy. Your repo is the source of truth — no CMS or build service required. |
| **Native OpenAPI API reference** | Point `docs.json` at a spec and get searchable, paginated, per-operation pages with a real Try It console. Rendered with the framework's own React components — zero Scalar/Vue dependency. |
| **MCP server** | Ship `/api/mcp` and every page becomes callable by Claude, Cursor, or any MCP client: `search`, `get_doc`, `list_operations`, `get_operation`. Self-hosted, no billing. |
| **AI ask-box** | BYO model (Anthropic, OpenAI, or Google) and API key. Answers are grounded in your actual content with cited sources. |
| **`/llms.txt` out of the box** | The [llms.txt](https://llmstxt.org) convention — a curated index and full-corpus export for LLMs and agentic tools. |
| **Full-text search** | [Pagefind](https://pagefind.app/) indexes your built HTML at deploy time. Fast, client-side, no server required. |
| **Diagrams** | ` ```mermaid ` fences become zoomable, pannable diagrams themed to your site — with a fullscreen view, minimap, and SVG download. Mermaid only loads on pages that have one. |
| **Blog & changelog** | Drop files in `content/blog/` or `content/changelog/` — routes and nav links appear automatically. |
| **Own your deployment** | A normal Next.js app. Ship to Vercel, AWS Amplify, a container, or a subpath on an existing site. |
| **Genuinely open** | MIT licensed. No telemetry, no required account, no lock-in. |

## Themes

Three production themes share one proven app structure. They differ only in design tokens, fonts, and brand assets — so switching themes is mostly a CSS file change.

| Theme | Style | Best for |
| --- | --- | --- |
| [**Canopy**](./templates/canopy) *(default)* | Dark, vivid green accent, collapsible sidebar | Developer docs, API-first products |
| [**Shadcn**](./templates/shadcn) | Zinc monochrome, shadcn/ui aesthetic | Teams already on the shadcn design language |
| [**Galley**](./templates/galley) | Warm paper + ink, editorial red accent | Inkform's own design system — editorial, brand-forward sites |

Legacy themes (Aurora, Fern, Cedar, Mono, Base, and an older Galley) are preserved in [`archive/templates/`](./archive/templates/) for reference but are not scaffoldable via the CLI.

**Want to contribute a new theme?** See [Contributing a theme](./CONTRIBUTING.md#contributing-a-theme) — great designs can be added to the CLI's theme picker.

## Monorepo

This repository is an npm workspaces monorepo. Published packages ship to npm; everything else is private and used for development and demos.

| Path | Package | Published | What it is |
| --- | --- | :---: | --- |
| [`packages/framework`](./packages/framework) | `@inkform/framework` | ✓ | The MDX + OpenAPI rendering engine |
| [`packages/cli`](./packages/cli) | `@inkform/cli` | ✓ | `npx` scaffolder (`inkform-docs` binary) |
| [`templates/canopy`](./templates/canopy) | `@inkform/theme-canopy` | | Canopy theme |
| [`templates/shadcn`](./templates/shadcn) | `@inkform/theme-shadcn` | | Shadcn theme |
| [`templates/galley`](./templates/galley) | `@inkform/theme-galley` | | Galley theme |
| [`examples/pokeapi-docs`](./examples/pokeapi-docs) | `@inkform/example-pokeapi` | | Full PokéAPI docs site (OpenAPI + e2e tests) |
| [`examples/markdown-docs`](./examples/markdown-docs) | `@inkform/example-markdown` | | Markdown/MDX feature reference |
| [`examples/inkform-docs`](./examples/inkform-docs) | `@inkform/example-inkform-docs` | | This framework's own docs (dogfooded) |

## Develop in this repo

**Prerequisites:** Node.js 22+, npm.

```bash
git clone https://github.com/inkform-dev/framework.git
cd framework
npm install                  # installs all workspaces
npm run typecheck            # typecheck every package
npm test                     # framework unit tests (Vitest)
npm run build                # build all workspaces
npm run build:examples       # build the three demo sites only
```

**Run a workspace locally:**

```bash
# Examples
npm run dev --workspace=@inkform/example-pokeapi
npm run dev --workspace=@inkform/example-inkform-docs
npm run dev --workspace=@inkform/example-markdown

# Themes
npm run dev --workspace=@inkform/theme-canopy
npm run dev --workspace=@inkform/theme-shadcn
npm run dev --workspace=@inkform/theme-galley
```

**Scaffold from local templates** (useful when developing themes or the CLI):

```bash
node packages/cli/bin/index.mjs init /tmp/test-docs --theme canopy --from templates -y
```

**End-to-end tests** (manual — not in CI, to avoid hammering the live PokéAPI):

```bash
npm run test:e2e --workspace=@inkform/example-pokeapi
```

Changes to `packages/framework` are picked up immediately in themes and examples via the workspace link and `transpilePackages`.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full contributor guide — PR process, theme requirements, and conventions.

## Documentation

| Doc | Description |
| --- | --- |
| [ARCHITECTURE.md](./packages/framework/ARCHITECTURE.md) | Engine API contract — read this before writing a theme or extending the framework |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute code, themes, and fixes |
| [CHANGELOG.md](./CHANGELOG.md) | Release history |
| [MIGRATION.md](./MIGRATION.md) | Upgrade guide (e.g. 0.3 → 0.4 native API renderer) |
| [PUBLISHING.md](./packages/framework/PUBLISHING.md) | Maintainer release process for npm packages |

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md). Upgrading from an existing `docs.json`? See [`MIGRATION.md`](./MIGRATION.md).

## License

[MIT](./LICENSE) — Copyright (c) 2026 inkform.
