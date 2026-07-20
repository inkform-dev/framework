import * as React from 'react';
import { loadDocsConfig, loadOpenApiSpecForBuild, slugify } from './content';
import { docTabs } from './nav';
import { parseOpenApi, findOperation } from './openapi';

/**
 * Tag-slugging that matches Scalar's own default (`@scalar/helpers`'
 * `slugify()`, used internally by `generateTagSlug`): lowercase, strip
 * non-word chars, and — unlike content.ts's slugify() — collapse
 * underscores into hyphens too. Kept separate from content.ts's slugify()
 * because it must match an external system's URL scheme exactly, not this
 * framework's own doc-page slugs.
 */
function scalarTagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Cross-links prose to a specific operation on the API Reference tab, e.g.
 * `<ApiLink operationId="listPlants">List plants</ApiLink>`. Resolves the
 * project's configured OpenAPI spec (docs.json's `openapi` tab) at MDX-render
 * time and builds Scalar's own deep-link hash convention —
 * `#tag/<tag-slug>/<METHOD><path>`, e.g. `#tag/plants/GET/plants` — which is
 * Scalar's documented default (`generateOperationSlug`/`generateTagSlug` in
 * `@scalar/types`), empirically confirmed against a running Scalar page.
 *
 * Throws at MDX-render (build) time if no OpenAPI spec is configured or the
 * operationId doesn't exist in it, so a stale cross-link fails the build
 * instead of shipping a dead link.
 */
export async function ApiLink({
  operationId,
  children,
}: {
  operationId?: string;
  children?: React.ReactNode;
}) {
  if (!operationId) {
    throw new Error('<ApiLink> requires an operationId prop.');
  }

  const config = loadDocsConfig();
  const tab = config ? docTabs(config).find((t) => !!t.openapi) : null;
  if (!tab?.openapi) {
    throw new Error(
      `<ApiLink operationId="${operationId}"> was used, but this project has no OpenAPI spec configured (docs.json's "openapi" field on a tab).`,
    );
  }

  const spec = await loadOpenApiSpecForBuild(tab.openapi);
  if (!spec) {
    throw new Error(`<ApiLink operationId="${operationId}">: could not load the OpenAPI spec at "${tab.openapi}".`);
  }

  const model = await parseOpenApi(spec.raw, spec.format);
  const op = findOperation(model, operationId);
  if (!op) {
    throw new Error(
      `<ApiLink operationId="${operationId}">: no operation with this id in the OpenAPI spec. Check the spec's operationId or update this cross-link.`,
    );
  }

  const apiBase = slugify(tab.tab);
  const href = `/${apiBase}#tag/${scalarTagSlug(op.tag)}/${op.method.toUpperCase()}${op.path}`;

  return <a href={href}>{children ?? op.summary}</a>;
}
