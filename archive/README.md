# Archived templates

The six themes here — `aurora`, `base`, `cedar`, `fern`, `galley`, `mono` —
are the pre-0.4.0 template set, kept as a historical reference. They were
archived in `8245b0a`. The templates the CLI actually scaffolds from live in
`../templates` (`canopy`, `galley`, `shadcn`).

## These do not build as-is

Each of the six depends on `@inkform/framework: ^0.3.0`. On a 0.x version a
caret range cannot cross the minor, so `^0.3.0` resolves to the published
`0.3.0` — while the source in these directories was written against the
newer API that shipped in `0.4.0`. A standalone `npm install && npm run
build` in any of them fails at module resolution:

    Module not found: Can't resolve '@inkform/framework/ai'
    Module not found: Can't resolve '@inkform/framework/openapi-render'
    Module not found: Can't resolve '@inkform/framework/openapi-engine/nav'
    Module not found: Can't resolve '@inkform/framework/openapi-engine/parse'

`tsc --noEmit` fails for the same reason, plus two API-shape mismatches: the
templates pass a `contentType` prop to `DocsShell` and read `apiReference`
off `DocsTab`, neither of which exists in 0.3.0.

This is expected for archived code and is **not** a regression. It is
recorded here so the next person to open this directory doesn't spend time
diagnosing it, and so a current-looking dependency version isn't mistaken
for a maintained template.

Reviving one of these means re-pointing it at `@inkform/framework: ^0.4.0`
and reconciling the template source with the 0.4.0 API — see
[`../MIGRATION.md`](../MIGRATION.md) and the 0.4.0 entry in
[`../CHANGELOG.md`](../CHANGELOG.md).

## Why dependency versions here still get bumped

`archive/templates/*` is outside the root `package.json`'s `workspaces`
array, so nothing here is installed, typechecked, or built by `npm ci` or by
CI. But Dependabot reads every `package.json` in the repo regardless, so
these six manifests still raise alerts and still need patching — as of the
Next.js 16.2.12 bump they accounted for 54 of the repo's 60 open alerts.

Bumping a version string here is therefore an alert-hygiene change with no
effect on any build. It does not imply the template was retested; the
breakage described above applies before and after.
