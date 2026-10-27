# Changelog — @inkform/astro

Versions track `packages/astro/package.json`. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- Headings inside changelog entries no longer share ids across entries: each
  entry's heading and footnote ids are scoped to it (`#v0-2-0-added`), and
  two entries whose files share a name get distinct anchors. A `version`
  written with its `v` (`v1.2.0`) no longer shows as `vv1.2.0`, and the date
  is a `<time>` element.
- Every link the integration prints respects Astro's `base`. Site-root links
  in docs.json (`navbarLinks`, `anchors`, `cta`, sidebar entries with an
  `href`) and in MDX that aren't docs pages (`/`, `/pricing`) get the base in
  front, as images already did; docs-page links still go through the docs
  base. Links already under the base are left alone, so sites that wrote it
  out by hand keep working.
- MDX links written with the docs base (`/docs/quickstart`) are recognized as
  docs pages, so they get `publicBase` and the trailing slash too.
- `llms.txt` links follow Astro's `trailingSlash`, like the pages. The index is
  built from the site's own route table now, so operation links also match
  the pages for specs without `operationId`s.
- The header fits a 375px screen: on screens 40rem and under the tab row moves
  to the drawer (galley keeps its own row), the ⌘K hint is hidden, and a long
  site name gets an ellipsis.
- API operation pages no longer scroll sideways on phones: the stacked
  column stays the width of the screen and long code samples scroll inside
  their block.

### Added

- `components` option: a module of the site's own MDX components. Every
  capitalized export works in MDX without imports, next to the kit's, and a
  kit name it reuses replaces the kit's component. A `.tsx`/`.jsx` module
  works in a site without `@astrojs/react`: the integration has Vite compile
  its JSX for React when no UI integration does.
- `credits` option: a small "Built with Inkform" link to the Inkform repository
  under every docs page. Off by default.
- README: how to write changelog entries (file names, frontmatter, anchors).
- `--fw-label-transform`, `--fw-label-letter-spacing` and
  `--fw-label-font-size` set the case, tracking and size of the sidebar's
  group names and the "On this page" title, which stay small uppercase by
  default.

## [0.1.0] — 2026-10-23

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
