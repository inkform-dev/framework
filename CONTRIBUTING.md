# Contributing to inkform-docs

Thanks for helping out! This is a workspace monorepo for an open-source
documentation framework.

## Layout

```
packages/framework   @inkform/framework — the MDX + OpenAPI engine
packages/cli         @inkform/cli — the `npx` scaffolder
templates/*          the themes (aurora, fern, cedar, mono, base, galley)
examples/*           full demo sites (pokeapi-docs, markdown-docs, inkform-docs)
```

## Develop

```bash
npm install                 # installs every workspace
npm run typecheck           # typecheck all packages
npm test                    # framework's Vitest unit tests
npm run build                # next build across every theme + example

# run a theme or example:
npm run dev --workspace=@inkform/theme-aurora
npm run dev --workspace=@inkform/example-pokeapi

# real-browser e2e smoke test (builds + serves pokeapi-docs, drives it with
# a real Chromium; the one test that makes a real request talks to the
# live PokeAPI once, not in a loop):
npm run test:e2e --workspace=@inkform/example-pokeapi
```

Each theme/example is a standalone Next.js 16 app; the framework resolves via the
workspace link, so changes to `packages/framework` are picked up immediately
(thanks to `transpilePackages`).

`.github/workflows/ci.yml` runs `lint` → `typecheck` → `test` → `build` →
`npm audit --audit-level=high` on every PR (whatever branch it targets — some
in-flight work here stacks a chain of PRs branch-to-branch before eventually
landing on `main`) and on every push to `main`. Same commands as above;
nothing CI does that you can't run locally first.

## How the pieces fit

- The **framework** is headless logic + a themeable component kit. The public API
  contract is documented in
  [`packages/framework/ARCHITECTURE.md`](./packages/framework/ARCHITECTURE.md).
- A **theme** is a full app that imports the kit and restyles it with a single
  `app/theme.css` token file. Theme app code (routing, `lib/route.tsx`, the
  `[[...slug]]` page, `components/`) is intentionally identical across themes —
  the differences are tokens, fonts, and brand SVGs.
- The **CLI** downloads a theme as a standalone project.

### Adding a theme

1. Copy an existing theme dir (e.g. `templates/aurora`) to `templates/<name>`.
2. Give it a unique `package.json` name (`@inkform/theme-<name>`).
3. Restyle `app/theme.css` (tokens), `app/layout.tsx` (fonts), and `public/*.svg`.
   Leave the routing/components alone.
4. Add it to the CLI's theme list in `packages/cli/src/scaffold.mjs`.
5. `npx tsc --noEmit` and `npx next build` must pass.

### Adding MDX components or engine features

Implement in `packages/framework/src`, update `ARCHITECTURE.md`, and make sure
`npm run typecheck` passes from `packages/framework`.

## Source mirror (maintainers)

This public repo is kept in sync with a private working monorepo via
`git subtree`. Merged PRs here are pulled back into the source, so contribute
normally — open a PR against this repo and it flows upstream.

## Conventions

- Conventional-commit style messages (`feat:`, `fix:`, `docs:`, `chore:`).
- TypeScript strict; no `any` that breaks the build.
- Style only via `--fw-*` tokens + Lucide icons (`strokeWidth` ~1.75); no
  hardcoded hex in theme components.
- Don't commit build artifacts (`.next`, `*.tsbuildinfo`) — they're gitignored.

By contributing you agree your work is licensed under the repository's MIT license.
