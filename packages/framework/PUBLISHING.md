# Publishing — `@inkform/framework` + `@inkform/cli`

Two packages in this monorepo are actually published to public npm under the
`@inkform` org (org already exists on npmjs.com):

- **`packages/framework`** → `@inkform/framework` (MIT, `private: false`,
  `publishConfig.access: public`). Ships TypeScript source directly;
  consumers add `transpilePackages: ['@inkform/framework']` (no build step).
- **`packages/cli`** → `@inkform/cli` (MIT, `private: false`), bin command
  `inkform-docs`. Scaffolds new projects by fetching a template directly from
  GitHub (`github:inkform-dev/framework/templates/<theme>` via `giget`) — it
  does **not** fetch the 5 themes or 2 examples as npm packages. Those
  (`templates/*`, `examples/*`) are `private: true` and stay that way; they
  are not meant to be installed from npm at all, only copied by the CLI or
  cloned directly.

This is the only publish blocker left from earlier passes (tracked as "the
temporary dependency bridge" — every consumer today declares
`"@inkform/framework": "npm:@freewrite-cms/framework@^0.2.0"`, an alias to
the last real published snapshot, since `@inkform/framework` itself has never
been published). Publishing closes that out permanently.

## Prerequisites (one-time, needs your own npm login — not something an
## agent session can do; publishing to public npm is a real, hard-to-reverse
## action)

```bash
npm whoami            # confirm you're logged in as an @inkform org member
# if not:
npm login
```

## Release — do framework first, then cli (cli doesn't depend on framework
## at publish time, but framework going out first means anyone testing cli
## against a fresh `npm install` immediately gets a real, resolvable
## `@inkform/framework`)

```bash
cd packages/framework
npm version <patch|minor|major>   # bumps package.json, no git tag pushed automatically
npm publish
```

```bash
cd ../cli
npm version <patch|minor|major>
npm publish
```

Both commands run from a clean `git status` (commit first) so the published
`package.json` version matches what's in git.

## After publishing — retire the dependency-alias bridge

Every consumer currently pins the OLD published snapshot under the new name:

```json
"@inkform/framework": "npm:@freewrite-cms/framework@^0.2.0"
```

Once the real `@inkform/framework` is live on npm, change this in every
`package.json` that has it (all 5 themes, both examples, and — in the
**separate** `cms/` repo — `apps/blog`, `apps/docs`, and
`packages/templates/{blog-only,docs-only,unified}`) to a plain version range
matching whatever you just published:

```json
"@inkform/framework": "^0.3.0"
```

Then, in each repo:

```bash
npm install          # re-resolves the lockfile against the real package
npm run build         # confirm nothing broke
```

This is a mechanical find-and-replace across ~10 `package.json` files plus a
lockfile regeneration in each of the two repos (`framework/` and `cms/`) —
safe to do in one pass once the npm publish itself has happened, since it's
just pointing at the real thing instead of the alias.

## Optional: ship compiled JS instead of source

To let consumers skip `transpilePackages`, add a build step and point
`exports` at `dist/`:

```bash
npm i -D tsup
# package.json
# "scripts": { "build": "tsup src/*.ts src/*.tsx --format esm --dts --external next,react,react-dom" }
# "files": ["dist"], exports → ./dist/*.js
```

Not required — TS-source-direct + `transpilePackages` works fine and is what
every template/example already does. Only worth it if a consumer outside
this monorepo's own conventions complains about build times or wants to
avoid the `transpilePackages` requirement.

## Versioning across the monorepo

For coordinated releases of `@inkform/framework` + `@inkform/cli`,
[Changesets](https://github.com/changesets/changesets) is recommended:

```bash
npm i -D @changesets/cli && npx changeset init
# per change: npx changeset → npx changeset version → npx changeset publish
```

See the repository `CONTRIBUTING.md` for the dev workflow and the source-mirror
arrangement.
