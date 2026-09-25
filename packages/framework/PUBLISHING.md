# Publishing — `@inkform/framework` + `@inkform/cli`

Two packages in this monorepo are published to public npm under the
`@inkform` org:

- **`packages/framework`** → [`@inkform/framework`](https://www.npmjs.com/package/@inkform/framework)
  (MIT, `publishConfig.access: public`). Ships TypeScript source directly;
  consumers add `transpilePackages: ['@inkform/framework']`. No build step,
  so there is nothing to compile before publishing.
- **`packages/cli`** → [`@inkform/cli`](https://www.npmjs.com/package/@inkform/cli),
  bin command `inkform-docs`. Scaffolds projects by fetching a template
  from GitHub (`github:inkform-dev/framework/templates/<theme>` via `giget`),
  not from npm.

`templates/*` and `examples/*` are `private: true` and stay that way — they
are copied by the CLI or cloned directly, never installed from npm.

Releases run through
[`.github/workflows/release.yml`](../../.github/workflows/release.yml).
**Nobody publishes from a laptop, and no npm token exists anywhere in this
repo.**

---

## How authentication works (npm Trusted Publishing)

The release workflow authenticates to npm with a short-lived OIDC token that
GitHub mints for that workflow run. npm accepts it because each package's
"Trusted publisher" settings on npmjs.com name this repository *and this
exact workflow filename*. There is no `NPM_TOKEN` secret to leak, rotate, or
scope, and a fork cannot publish: a fork's OIDC claim carries the fork's own
repository name and npm rejects it.

Two consequences worth knowing before you touch anything:

- **Renaming or moving `.github/workflows/release.yml` breaks publishing**
  until the filename is updated on npmjs.com to match. That coupling is the
  security property.
- Every publish made this way carries a **provenance attestation** — the
  "Built and signed on GitHub Actions" badge on the npm page, linking the
  tarball back to the exact commit and workflow run that produced it.

---

## Cutting a release

Framework first, then CLI. They version independently; there is no
requirement that their numbers match.

1. **Bump the version** in `packages/<framework|cli>/package.json`. Published
   versions are immutable, so this must be a version that has never been
   published — the workflow checks and refuses otherwise.
2. **Update `CHANGELOG.md`** at the repo root (it tracks
   `packages/framework`'s version).
3. **Commit and push to `main`.** The tag must point at a commit that is
   actually on the branch.
4. **Tag and push the tag:**

   ```bash
   git tag -a framework-v0.5.0 -m "@inkform/framework 0.5.0"
   git push origin framework-v0.5.0
   ```

   The prefix selects the package: `framework-v*` → `packages/framework`,
   `cli-v*` → `packages/cli`. The version in the tag must equal the version
   in that package's `package.json`; the workflow refuses to guess.

5. **Approve the deployment** if the `npm-publish` environment has required
   reviewers configured (recommended — see below).

> **Tag promptly after merging a release PR.** `templates/*` declare a real
> npm range (`"@inkform/framework": "^<current>"`), and the CLI scaffolds
> straight from GitHub `main` via giget — it does not pin a ref. Between
> merging a version bump and the tag actually publishing, `npx @inkform/cli
> init` hands users a `package.json` asking for a version npm doesn't have
> yet, and their `npm install` fails. The window is however long the
> `npm-publish` approval sits unattended, so don't merge a release PR you
> aren't around to approve.

The workflow re-runs the full CI gate (`lint`, `typecheck`, `test`, `build`,
`npm audit --audit-level=high`) against the tagged commit before publishing.
A green PR check is not proof the tagged commit is green.

### Rehearsing without publishing

Actions → Release → *Run workflow* → pick the package, leave **Dry run**
checked. Everything runs including `npm pack --dry-run`, and the publish step
is skipped. Useful for confirming the tarball contents after changing
`files` or `exports`.

---

## One-time setup

Already done once per package, recorded here for whoever has to redo it:

**On npmjs.com** — package page → Settings → Trusted Publisher → GitHub Actions:

| Field | Value |
| --- | --- |
| Organization or user | `inkform-dev` |
| Repository | `framework` |
| Workflow filename | `release.yml` |
| Environment name | `npm-publish` |

Then, on the same settings page, set publishing access to **"Require
two-factor authentication and disallow tokens."** That kills classic
automation tokens as a publish path entirely; trusted publishing is
unaffected by it.

**On GitHub** — Settings → Environments → `npm-publish` → add yourself as a
required reviewer. This is a second, independent gate: even someone who can
push a tag cannot ship without a human approving the run.

---

## Versioning

Versions are bumped by hand, and `CHANGELOG.md` is written by hand. If that
becomes a chore across more than these two packages,
[Changesets](https://github.com/changesets/changesets) automates both — but
it earns its keep at four or five packages, not two.

## Optional: ship compiled JS instead of source

To let consumers skip `transpilePackages`, add a build step and point
`exports` at `dist/`:

```bash
npm i -D tsup
# "scripts": { "build": "tsup src/*.ts src/*.tsx --format esm --dts --external next,react,react-dom" }
# "files": ["dist"], exports → ./dist/*.js
```

Not required — TS-source-direct works fine and is what every template and
example already does. Only worth it if a consumer outside this monorepo's
conventions wants to avoid `transpilePackages`.
