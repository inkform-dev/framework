# Changelog — @inkform/astro

Versions track `packages/astro/package.json`. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] — Unreleased

First release. Needs `@inkform/framework` 0.8.0, which adds
`./mdx-options`, `./routes`, `./mermaid/render`, `./openapi-render/try-it`,
`./openapi-render/sample` and `buildLlmsTxt({ basePath })`.

### Added

- `inkform(options)`: an Astro 7 integration that adds prerendered routes
  under `base` (default `/docs`) for every docs.json page, the API Reference
  (an index and a page per operation), the blog and changelog when their
  folders have entries, and `llms.txt` / `llms-full.txt`.
- MDX through the framework's own pipeline (`compileMdx`), every kit
  component available without imports, rendered to static HTML by React at
  build time. Site-root links to docs pages get the base added.
- The shell (header with tabs, sidebar, TOC, breadcrumbs, pagination, mobile
  drawer, theme toggle) as Astro components with the framework's `fw-*`
  markup.
- Browser behaviour without React: tabs, code groups, TOC highlight, drawer,
  theme toggle, search dialog, API sample pickers, Try It, newsletter form,
  Mermaid diagrams (opt-in).
- Pagefind index after `astro build`, written to `<base>/_pagefind/`.
- Themes as CSS token files: `galley` (default, ported from
  `templates/galley`), `plain`, or your own file; `customCss` for more.
- Works under Astro's `security.csp`: inline styles from Shiki move into one
  hashed `<style>`, the theme script's hash is registered, and search and
  diagram pages add what they need to their own policy only.
- `publicBase` for hosts that serve the docs from another path or host.
