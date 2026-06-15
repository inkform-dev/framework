# Publishing & extraction guide — `@freewrite-cms/framework`

The package is **OSS-ready** (public, `private: false`, `publishConfig.access:
public`, MIT, README/LICENSE) and the whole monorepo already consumes it under
the `@freewrite-cms` scope. The remaining steps are **owner-gated** because they
need an npm org + credentials that only you can create. Builds work today via the
workspace link, so none of this blocks development.

## 1. One-time: create the npm org (OWNER)
```bash
# Create the org at https://www.npmjs.com/org/create  → name: freewrite-cms
npm login
```
(If you rebrand later, this scope changes — renaming a published package has no
redirect, so treat `@freewrite-cms` as the public name until you're sure.)

## 2. Add a real build step before the first PUBLIC release (recommended)
The package currently ships raw `.ts/.tsx` and works because consumers set
`transpilePackages`. For arbitrary external consumers, compile to JS + d.ts so
they don't need that:
```bash
npm i -D tsup
```
```jsonc
// package.json — add, then point exports at dist/ and set "files": ["dist"]
"scripts": { "build": "tsup src/*.ts src/*.tsx --format esm --dts --external next,react,react-dom" }
```
Until then, the README documents the `transpilePackages` requirement (acceptable
for internal/early use).

## 3. Publish
```bash
cd packages/framework
npm run build        # if the build step was added
npm publish          # publishConfig already targets public npm
```
Consider **Changesets** for versioned releases:
`npm i -D @changesets/cli && npx changeset init`, then `changeset` → `changeset
version` → `changeset publish` in CI.

## 4. Public source mirror — BIDIRECTIONAL (the chosen setup)

This monorepo stays **private** and remains the working source. The framework is
mirrored to a **public** GitHub repo containing ONLY `packages/framework` (verified
clean — `git subtree split` filters to the prefix, no private app code leaks).
Sync is **two-way** via `git subtree` (built-in; `push` and `pull` both exist):

- **push** — your monorepo changes → the public mirror
- **pull** — contributors' merged PRs on the mirror → back into `packages/framework`

Wrapped by `scripts/framework-mirror.sh` so you don't memorize the commands.

### One-time setup (OWNER)
```bash
# 1. Create the public repo on GitHub, e.g. github.com/freewrite-cms/framework
# 2. Wire it as a remote of THIS monorepo:
git remote add framework-mirror git@github.com:freewrite-cms/framework.git
# 3. Seed it with the framework's history (framework files land at the repo root):
./scripts/framework-mirror.sh push
# 4. Point package.json "repository" at the real URL (currently a placeholder).
```

### Ongoing
```bash
./scripts/framework-mirror.sh push   # after editing the framework here
./scripts/framework-mirror.sh pull   # after a PR is merged on the public mirror
```

A merged public PR flows home with `pull`, then you re-`npm publish` from
`packages/framework`. (Heavier collaboration? `git-subrepo` is a cleaner drop-in
for the same two-way flow; subtree is the zero-dependency built-in we use here.)

### If you'd rather fully extract instead of mirror
Move the framework out of the monorepo into its own repo; consumers then use the
published npm version (or **yalc** for local dev — Turbopack resolves yalc's copy
where it won't follow `npm link` symlinks). Drop `packages/framework` from the
monorepo `workspaces`. The mirror above is preferred — it keeps the 6 in-repo
consumers building via the workspace symlink while still giving a public source repo.

## Consumers to repoint (already on `@freewrite-cms/framework`)
`apps/freewrite-cms`, `apps/blog`, `apps/docs`, and the three
`packages/templates/*`. They resolve via the workspace today; switch them to the
published version (or yalc) at extraction time.
