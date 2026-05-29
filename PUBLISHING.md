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

## 4. (Optional) extract to its own public repo
The owner wants this to live OUTSIDE the private app monorepo eventually:
```bash
# Fresh standalone public repo (no private history)
mkdir ~/Repositories/devsForFun/freewrite-framework && cd $_
git init && cp -r <monorepo>/packages/framework/{src,package.json,README.md,LICENSE,PUBLISHING.md,tsconfig.json} .
```
Then either publish from there, or keep developing in the monorepo and mirror via
`git subtree split`. For local cross-repo development without republishing, use
**yalc** (`npx yalc publish` in the framework, `npx yalc add @freewrite-cms/framework`
in each consumer) — Turbopack resolves the copied package where it won't follow
`npm link` symlinks. Once extracted, drop `packages/framework` from the monorepo
`workspaces` and add the published dep to each consumer.

## Consumers to repoint (already on `@freewrite-cms/framework`)
`apps/freewrite-cms`, `apps/blog`, `apps/docs`, and the three
`packages/templates/*`. They resolve via the workspace today; switch them to the
published version (or yalc) at extraction time.
