# Contributing to inkform-docs

Thank you for helping improve inkform-docs! This guide covers everything you
need to get started — from running the monorepo locally to shipping a new
documentation theme that lands in the CLI's theme picker.

## Table of contents

- [Prerequisites](#prerequisites)
- [Repository layout](#repository-layout)
- [Development workflow](#development-workflow)
- [CI and quality gates](#ci-and-quality-gates)
- [How the pieces fit](#how-the-pieces-fit)
- [Contributing a theme](#contributing-a-theme)
- [Contributing engine features](#contributing-engine-features)
- [Contributing to the CLI](#contributing-to-the-cli)
- [Pull request process](#pull-request-process)
- [Conventions](#conventions)
- [Releases (maintainers)](#releases-maintainers)
- [Source mirror (maintainers)](#source-mirror-maintainers)

---

## Prerequisites

- **Node.js 22+** — required by the framework and CI (see root `engines`)
- **npm** — this monorepo uses npm workspaces (not pnpm or Turborepo)
- A GitHub account with access to fork and open PRs against
  [`inkform-dev/framework`](https://github.com/inkform-dev/framework)

```bash
git clone https://github.com/inkform-dev/framework.git
cd framework
npm install
```

---

## Repository layout

```
packages/
  framework/          @inkform/framework — the MDX + OpenAPI engine (published)
  cli/                @inkform/cli — the npx scaffolder (published)

templates/
  canopy/             @inkform/theme-canopy — dark, green accent (default)
  shadcn/             @inkform/theme-shadcn — zinc monochrome
  galley/             @inkform/theme-galley — warm paper + ink

examples/
  pokeapi-docs/       Full PokéAPI docs site + Playwright e2e tests
  markdown-docs/      Markdown/MDX feature reference
  inkform-docs/       This framework's own documentation (dogfooded)

archive/templates/    Legacy themes (aurora, fern, cedar, mono, base, galley)
                      preserved for reference — not scaffoldable via CLI
```

Only `@inkform/framework` and `@inkform/cli` are published to npm. Themes and
examples are private workspace packages used for development and demos.

---

## Development workflow

```bash
npm install                 # install every workspace + run postinstall prune
npm run typecheck           # typecheck all packages
npm test                    # framework unit tests (Vitest)
npm run build               # next build across every theme + example
npm run build:examples      # build the three demo sites only
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

Changes to `packages/framework` are picked up immediately in themes and
examples via the workspace link and `transpilePackages` — no publish step
needed during development.

**Scaffold from local templates** (essential when developing themes or the CLI):

```bash
node packages/cli/bin/index.mjs init /tmp/test-docs --theme canopy --from templates -y
cd /tmp/test-docs && npm install && npm run dev
```

Override the GitHub ref the CLI downloads from with `INKFORM_DOCS_REF=<branch>`
when testing against a fork or feature branch.

**End-to-end tests** (manual — deliberately excluded from CI):

```bash
npm run test:e2e --workspace=@inkform/example-pokeapi
```

The e2e suite makes one real request to the live PokéAPI per run. Fine for a
developer running it locally once, but not wired into CI to avoid hammering a
free, community-funded API on every push.

---

## CI and quality gates

`.github/workflows/ci.yml` runs on every PR and push to `main`:

```
lint → typecheck → test → build → npm audit --audit-level=high
```

Run the same commands locally before opening a PR. Nothing CI does that you
can't reproduce on your machine.

> **Note:** No workspace has a `lint` script yet — CI runs it with
> `--if-present` so it's a no-op today and will activate automatically once
> one is added.

---

## How the pieces fit

```
┌─────────────────────────────────────────────────────────┐
│  Content (MDX + docs.json + openapi.json)               │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  @inkform/framework — headless engine + component kit    │
│  (MDX, OpenAPI, search, MCP, AI, llms.txt)              │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Theme — Next.js app that imports the kit + theme.css   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  @inkform/cli — downloads a theme as a standalone app   │
└─────────────────────────────────────────────────────────┘
```

- The **framework** is headless logic + a themeable component kit. The public
  API contract lives in
  [`packages/framework/ARCHITECTURE.md`](./packages/framework/ARCHITECTURE.md).
- A **theme** is a full Next.js 16 app that imports the kit and restyles it
  with a single `app/theme.css` token file. Routing, components, and page
  structure are intentionally identical across themes — differences are tokens,
  fonts, and brand SVGs.
- The **CLI** downloads a theme from GitHub (via giget) and scaffolds it as a
  standalone project.

---

## Contributing a theme

New documentation site themes are one of the most valuable contributions you
can make. A well-designed theme that meets the contract below can be added to
the CLI's theme picker so every `npx @inkform/cli init` user can choose it.

### What makes a good theme contribution

- **Distinct visual identity** — it should look meaningfully different from
  Canopy, Shadcn, and Galley. We want real variety, not a fourth green-accent
  dark theme.
- **Polished defaults** — sample content, typography, spacing, and responsive
  behavior should feel production-ready out of the box.
- **Token-driven styling** — all colors, radii, and density via `--fw-*` CSS
  custom properties in `app/theme.css`. No hardcoded hex in components.
- **Accessible** — readable contrast, keyboard-navigable sidebar, sensible
  focus states. Test light and dark modes if your theme supports both.
- **Complete contract** — ships every route and integration the contract
  requires (see below).

### The theme contract

Every theme must satisfy the contract in
[`ARCHITECTURE.md` §12](./packages/framework/ARCHITECTURE.md#12-the-theme-contract).
In short, a theme is a standalone Next.js 16 app that:

1. Has `content/docs/docs.json` + sample MDX + a sample `openapi.json`.
2. Imports `@inkform/framework/styles.css` once, then overrides `--fw-*` tokens
   in `app/theme.css`.
3. Routes `/[[...slug]]` (docs), `/api-reference/[[...slug]]` (native OpenAPI
   renderer), `/blog`, `/blog/[slug]`, and `/changelog`.
4. Builds a Pagefind search index via a `postbuild` script and mounts
   `<SearchDialog>`, `<ThemeToggle>`, and `<AskAi>`.
5. Ships `/api/ask` (AI ask-box, flag-gated), `/api/mcp` (MCP server),
   `app/llms.txt` + `app/llms-full.txt`, `.env.example`, and a README with
   content and deploy guides.
6. Sets `transpilePackages: ['@inkform/framework']` in `next.config.ts`.
7. Uses a unique workspace name `@inkform/theme-<name>` and `"private": true`.

**Themes differ by `theme.css` tokens, fonts, and brand assets — not by
re-implementing routing, the shell, or engine integrations.**

### Step-by-step: adding a new theme

1. **Copy an existing theme** as your starting point:

   ```bash
   cp -r templates/canopy templates/<your-theme>
   ```

   Canopy is the default and most complete reference. Use it unless you have a
   specific reason to start from Shadcn or Galley.

2. **Rename the package** in `templates/<your-theme>/package.json`:

   ```json
   {
     "name": "@inkform/theme-<your-theme>",
     "description": "<Your Theme> — one-line description"
   }
   ```

3. **Restyle** — this is where your design work lives:
   - `app/theme.css` — override `--fw-*` design tokens (colors, radius, density)
   - `app/layout.tsx` — font choices
   - `public/logo.svg`, `public/favicon.svg`, `public/hero.svg` — brand assets
   - `content/docs/docs.json` — update the sample site name and accent color

   Leave routing (`app/[[...slug]]/`, `lib/route.tsx`, `components/`) alone
   unless you have a compelling UX reason and can justify the maintenance cost.

4. **Verify locally:**

   ```bash
   npm run typecheck --workspace=@inkform/theme-<your-theme>
   npm run build --workspace=@inkform/theme-<your-theme>
   npm run dev --workspace=@inkform/theme-<your-theme>

   # Scaffold test (from repo root):
   node packages/cli/bin/index.mjs init /tmp/theme-test --theme <your-theme> --from templates -y
   ```

5. **Register in the CLI** — add your theme to the `THEMES` array in
   `packages/cli/src/scaffold.mjs`:

   ```js
   { value: 'your-theme', label: 'Your Theme', hint: 'one-line description for the picker' },
   ```

6. **Write a theme README** at `templates/<your-theme>/README.md` covering:
   local dev, adding content, deploy to Vercel/Amplify, and any theme-specific
   features (follow the Canopy README as a template).

7. **Open a PR** with screenshots or a short screen recording showing your
   theme in light and dark mode (if applicable), on desktop and mobile.

### Theme review criteria

Maintainers evaluate theme PRs on:

| Criterion | What we look for |
| --- | --- |
| Visual quality | Distinct, polished, production-ready defaults |
| Contract compliance | All required routes, integrations, and build scripts present |
| Token hygiene | Styling via `--fw-*` tokens only; no hardcoded colors in components |
| Build health | `tsc --noEmit` and `next build` pass cleanly |
| Scaffold flow | `npx @inkform/cli init` with your theme produces a working project |
| Documentation | Theme README with content and deploy instructions |

Themes that don't meet the bar can still be shared as community examples — we
just won't add them to the CLI picker until they're ready.

---

## Contributing engine features

Engine changes go in `packages/framework/src/`.

1. Read [`ARCHITECTURE.md`](./packages/framework/ARCHITECTURE.md) first —
   it is the stable API contract that themes, the CLI, and examples all build
   against.
2. Implement in `packages/framework/src/`.
3. Add or update Vitest tests for non-trivial logic (`npm test`).
4. Update `ARCHITECTURE.md` if you change the public API (new exports, changed
   behavior, new `docs.json` fields).
5. Verify downstream: `npm run typecheck` and `npm run build` from the repo root.

If your change affects how themes wire up the engine (new route, new env var,
new component prop), update at least one theme as a reference implementation.

---

## Contributing to the CLI

The CLI lives in `packages/cli/`. Key files:

| File | Purpose |
| --- | --- |
| `bin/index.mjs` | Entry point (`inkform-docs` binary) |
| `src/scaffold.mjs` | Scaffold logic, theme list, giget download |

Test CLI changes locally:

```bash
node packages/cli/bin/index.mjs init /tmp/cli-test --theme canopy --from templates -y
```

When adding a theme to the picker, only `scaffold.mjs` needs updating — the
CLI downloads templates from `github:inkform-dev/framework/templates/<name>#main`
at scaffold time.

---

## Pull request process

1. **Fork** the repo and create a branch from `main`:

   ```bash
   git checkout -b feat/my-contribution
   ```

2. **Make your changes** following the conventions below.

3. **Verify locally** before pushing:

   ```bash
   npm run typecheck
   npm test
   npm run build
   ```

4. **Open a PR** against `main` with:
   - A clear title using [conventional commit](https://www.conventionalcommits.org/) style (`feat:`, `fix:`, `docs:`, `chore:`)
   - A description of what changed and why
   - Screenshots or recordings for visual changes (themes, UI components)
   - A test plan — what you ran and what you verified

5. **Address review feedback.** Maintainers may ask for changes before merging.

### PR checklist

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (if you touched `packages/framework`)
- [ ] `npm run build` passes
- [ ] `ARCHITECTURE.md` updated (if you changed the engine API)
- [ ] Theme README written (if you added a theme)
- [ ] CLI theme list updated (if you added a scaffoldable theme)
- [ ] No build artifacts committed (`.next/`, `*.tsbuildinfo`, `node_modules/`)

---

## Conventions

### Commits

Use [conventional commit](https://www.conventionalcommits.org/) prefixes:

```
feat: add harbor theme with nautical tokens
fix: correct sidebar collapse on mobile
docs: update theme contract in ARCHITECTURE.md
chore: bump @inkform/framework to 0.4.1
```

### TypeScript

- Strict mode — no `any` that breaks the build
- ESM throughout (`"type": "module"` where applicable)

### Styling

- **Framework and theme components:** style only via `--fw-*` CSS custom
  properties defined in `packages/framework/src/styles/tokens.css` and
  overridden in each theme's `app/theme.css`
- **Icons:** [Lucide](https://lucide.dev/) with `strokeWidth={1.75}` (or
  `~1.75`)
- **No hardcoded hex colors** in theme component files — use tokens

### Files to never commit

- `.next/`, `out/`, `.vercel/`
- `node_modules/`
- `*.tsbuildinfo`
- `.env.local` or any file containing secrets/API keys

---

## Releases (maintainers)

`@inkform/framework` and `@inkform/cli` are published to npm by
`.github/workflows/release.yml`, triggered by pushing a version tag
(`framework-v0.5.0`, `cli-v0.5.0`). It re-runs the full CI gate against the
tagged commit, then publishes with npm Trusted Publishing — a short-lived
OIDC token, no npm secret stored in this repository, and a provenance
attestation on every release.

Nobody publishes from a laptop. Full procedure and the one-time npm/GitHub
setup: [`packages/framework/PUBLISHING.md`](packages/framework/PUBLISHING.md).

---

## Source mirror (maintainers)

This public repo is kept in sync with a private working monorepo via
`git subtree`. Merged PRs here are pulled back into the source repo, so
contribute normally — open a PR against this repo and it flows upstream.

---

## License

By contributing, you agree that your contributions are licensed under the
repository's [MIT License](./LICENSE).
