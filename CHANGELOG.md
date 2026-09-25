# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions
track `packages/framework`'s own `package.json`.

## [0.5.0] — 2026-08-30

### Added

- **Every page is served as Markdown at its own URL** — append `.md` to any
  docs page (or content-negotiate) and get the source back as clean Markdown.
  Makes the whole site directly consumable by agents and LLM tooling without
  scraping rendered HTML.
- **`@inkform/framework/markdown`** — a structural MDX-to-Markdown converter
  that preserves link URLs and component labels instead of flattening them
  away, plus `@inkform/framework/page-actions` (`<PageActions>`): a per-page
  *Copy Markdown* / *Open in…* control rendered above the page title.
- **Expanded AI tool menu** — a two-column menu driven by a single data
  registry (`ai-tools.ts`) rather than hardcoded links: ChatGPT, Claude,
  Google (AI Overview), and copy-the-command entries for Claude Code,
  OpenCode, Codex, and Antigravity. Monochrome brand icons throughout.
- **`@inkform/framework/secondary-top-nav` and `/scrollable-top-nav`** —
  unified secondary navigation with mobile scroll hints and de-duplicated
  anchors/navbar links.

### Changed

- Copy actions give real feedback — copied-state on the button, with a
  confetti flourish on success (tokenized colors, no hardcoded hex).
- Glyph and clipboard helpers deduplicated into shared modules.

### Fixed

- The VS Code MCP install link pointed at the wrong handler.
- The ChatGPT share link now uses the `prompt` parameter.
- Mobile *Open* menu is capped at `80vw` instead of overflowing the viewport.
- The left column of the AI menu now shares the right column's gutter off the
  divider.
- **`@inkform/framework/reactions` resolves again.** The subpath export was
  dropped from the exports map in 0.4.0's development while
  `src/reactions.tsx` kept shipping, so the export documented in the package
  README and in the guides resolved to nothing. Every export present in 0.4.0
  is present in 0.5.0 — this release is purely additive.
- **Scaffolded projects get the current framework.** Every template and
  example declared `"@inkform/framework": "^0.3.0"`. For a 0.x package that
  range means `>=0.3.0 <0.4.0`, so `npx @inkform/cli init` followed by
  `npm install` resolved to 0.3.0 — no native API reference renderer, no MCP
  server, no AI ask-box, no `llms.txt`. The CLI rewrites a scaffolded
  project's `name` and `version` but never touched this range. Now `^0.5.0`.
- **Workspace shadowing fixed at the root.** The same stale range meant the
  local `packages/framework` no longer satisfied what the templates and
  examples asked for, so npm fetched a real 0.3.0 from the registry into each
  of the six workspaces' own `node_modules` — shadowing the live source. This
  is what `scripts/prune-workspace-shadows.mjs` had been deleting on every
  `postinstall`; the lockfile is 139 lines lighter without those entries. The
  script stays as a safety net, with its root-cause note corrected.

### Security

- 4 lockfile advisories patched (3 high, 1 moderate); archived templates
  bumped to Next 16.2.12, clearing 54 Dependabot alerts.

## [0.4.0] — 2026-07-21

### Added

- **Native API reference renderer** (`@inkform/framework/openapi-render`) —
  the API Reference tab renders with the framework's own React components:
  zero Scalar/Vue dependency, real per-operation pages (statically generated,
  not a client-side SPA embed), recursive `oneOf`/`anyOf`/`allOf` schema
  rendering, and multi-language code samples via `@scalar/snippetz`.
- **Native Try It console** — makes real HTTP requests from the browser
  (including streaming responses), not just a code-sample display.
- **Self-hostable MCP server** (`@inkform/framework/mcp`) — ship `/api/mcp`
  and your docs + API reference become callable by any
  [MCP](https://modelcontextprotocol.io) client (`search`, `get_operation`,
  `list_operations`, `get_doc`). No external platform, no billing.
- **AI ask-box grounding** (`@inkform/framework/ai`) — `askDocs()` grounds
  chat answers in the site's own content (the same retrieval the MCP server
  exposes) and cites its sources. BYO model: Anthropic, OpenAI, or Google.
- **`/llms.txt` and `/llms-full.txt`** (`@inkform/framework/llms-txt`) —
  the [llms.txt](https://llmstxt.org) convention: a curated index and a
  full-corpus concatenation for LLMs/agentic tools.
- **Pagefind search facets** — `DocsShell`'s new `contentType` prop tags
  indexed pages with a `type` filter (Docs/API/Changelog/Blog) for
  result-type badges and filtering; operation pages boost exact
  `operationId`/path matches.
- **Auto-detected Blog and Changelog** — `content/blog` / `content/changelog`
  light up their nav links and routes automatically when present, across
  every template and example.
- **Galley theme** — Inkform's own design system (warm paper + ink, one
  editorial accent), dogfooded by `examples/inkform-docs`.

### Changed

- **The API Reference tab's native renderer is now the default.**
  `docs.json`'s `apiReference.renderer` defaults to `'native'`; `'scalar'` is
  a documented escape hatch (bring your own `app/api-reference/route.ts`), not
  a functional default — no shipped example/template ships a Scalar route
  anymore. See [`MIGRATION.md`](./MIGRATION.md) if you have an existing
  `docs.json`.
- OpenAPI parsing/bundling/dereferencing rewritten on `@scalar/openapi-parser`
  + `@scalar/json-magic` — pure spec-parsing libraries with no Vue dependency
  (verified directly against their published packages, not assumed from
  their names).
- `parseOpenApi()` is now `async` (bundling/dereferencing requires it).
- **Node.js `>=22` now required** (up from `>=20`) — needed by the OpenAPI
  parser dependencies above.

### Fixed

- Dual-theme syntax-highlight tokens had no color in one theme.
- The Mono theme's stray accent color removed (true monochrome, as intended).
- Two-voice heading font and shared top-bar CSS backported to older examples
  that had drifted from the current templates.
