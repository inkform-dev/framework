# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions
track `packages/framework`'s own `package.json`.

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
