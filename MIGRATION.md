# Migrating to the native API reference renderer (0.3 → 0.4)

`@inkform/framework` 0.4.0 makes the native (React, no Scalar/Vue) API
reference renderer the default. If your `docs.json`'s API Reference tab
doesn't set `apiReference.renderer` explicitly, it now renders natively
instead of embedding `@scalar/nextjs-api-reference`. This note covers what
actually changes and what to do about it.

## Do you need to do anything?

**If your `docs.json` already sets `"apiReference": { "renderer": "native" }`
explicitly** (every template and example shipped with the framework has done
this since 0.3.x): no. Nothing changes for you.

**If your `docs.json` has an `openapi` field on a tab and no `apiReference`
key at all**: your API Reference tab switches from the Scalar embed to the
native renderer on your next deploy. Read on.

**If you want to keep the Scalar embed**: set
`"apiReference": { "renderer": "scalar" }` on that tab, and add back an
`app/api-reference/route.ts` — the framework no longer ships one by default
(every template deleted it when it migrated). The old route looked like this:

```ts
import { ApiReference } from '@scalar/nextjs-api-reference';
import { docTabs } from '@inkform/framework';
import { loadDocsConfig, resolveOpenApiSource } from '@inkform/framework/content';

export async function GET() {
  const config = loadDocsConfig();
  const tab = config ? docTabs(config).find((t) => !!t.openapi) : null;
  const source = tab?.openapi ? resolveOpenApiSource(tab.openapi) : null;
  if (!source) return new Response('No OpenAPI spec configured.', { status: 404 });
  return ApiReference({ ...source, mcp: tab?.mcp })();
}
```

You'll also need `@scalar/nextjs-api-reference` back in your `package.json` —
the framework itself no longer depends on it.

## What actually changes, behaviorally

**URL structure.** The old Scalar route served the *entire* API Reference tab
as one client-side-rendered single-page app at a single path (e.g.
`/api-reference`) — Scalar owned that whole subtree and did its own
in-page/client-side navigation between operations; there were no separate
server routes per operation. The native renderer generates a real, distinct,
statically-rendered page per operation:
`/api-reference/operations/{operationId}`. If anything external linked
directly into a specific operation inside your old Scalar embed, check
whether that link still resolves the way you expect — it now points at a
real page instead of client-side app state.

**Custom Scalar theming.** If you had a custom `scalar-theme-palette.ts` /
`buildScalarCustomCss()` config for the old embed, it doesn't carry over.
The native renderer uses the same `--fw-*` design tokens as the rest of your
docs site (see `ARCHITECTURE.md` §11) — restyle via those instead.

**The `docs.json` `mcp` field.** `DocsTab.mcp` (`{ name?, url?, disabled? }`)
was passed straight through to Scalar's own "Generate MCP" button. The native
renderer doesn't render that button — if you want an MCP server for your
docs, ship one directly via `@inkform/framework/mcp`'s `createMcpHandler()`
(see `ARCHITECTURE.md` §8) instead of pointing Scalar's button at one.

**What doesn't change.** Your OpenAPI spec itself, `docs.json`'s `openapi`
field, search, the rest of your docs, and the top-nav tab link
(`apiBasePath()` resolves the same way either renderer).

## Why the default flipped

Every template and example shipped with the framework had already fully
migrated to the native renderer — none of them had a working Scalar route
left. An *unconfigured* `docs.json` (the common case for anyone following
the docs without knowing this specific flag exists) was 404ing on its own API
Reference tab, because the old guard required `renderer === 'native'`
explicitly rather than defaulting to it. The default now matches what every
real deployment of this framework already does.
