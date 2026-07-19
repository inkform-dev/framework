# Publishing — `@inkform/framework`

This package is published to public npm under the `@inkform` org
(`private: false`, `publishConfig.access: public`, MIT). It ships TypeScript
source; consumers add `transpilePackages: ['@inkform/framework']`.

## Release

From `packages/framework`:

```bash
npm version <patch|minor|major>
npm publish
```

The themes and examples depend on `@inkform/framework: ^0.2.0` and resolve
the local workspace copy during development; published consumers get it from npm.

## Optional: ship compiled JS

To let consumers skip `transpilePackages`, add a build step and point `exports`
at `dist/`:

```bash
npm i -D tsup
# package.json
# "scripts": { "build": "tsup src/*.ts src/*.tsx --format esm --dts --external next,react,react-dom" }
# "files": ["dist"], exports → ./dist/*.js
```

## Versioning across the monorepo

For coordinated releases of `@inkform/framework` + `@inkform/cli`,
[Changesets](https://github.com/changesets/changesets) is recommended:

```bash
npm i -D @changesets/cli && npx changeset init
# per change: npx changeset → npx changeset version → npx changeset publish
```

See the repository `CONTRIBUTING.md` for the dev workflow and the source-mirror
arrangement.
