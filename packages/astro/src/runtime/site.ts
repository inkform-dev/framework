/**
 * Everything one docs site is made of, read once per build: docs.json, the
 * parsed OpenAPI spec, blog posts, changelog entries, and the route table
 * built from them. The framework's loaders read the content folder named by
 * DOCS_CONTENT_ROOT, which is set here from the integration's options.
 */

import config from 'virtual:@inkform/astro/config';
import type { BlogPost, ChangelogEntry } from '@inkform/framework/content';
import { loadBlogPosts, loadChangelogEntries, loadDocsConfig, loadOpenApiSpecForBuild } from '@inkform/framework/content';
import type { DocsConfig, DocsTab } from '@inkform/framework/nav';
import { findOperation, parseOpenApi, type ApiOperation, type OpenApiModel } from '@inkform/framework/openapi';
import { buildNavTree, type OpenApiNavTree } from '@inkform/framework/openapi-engine/nav';
import { parseOpenApiDocument } from '@inkform/framework/openapi-engine/parse';
import { apiTab, apiTabSlug } from '@inkform/framework/routes';
import { buildRoutes, createLinker, operationPath, routeIndex, type Linker, type SiteRoute } from './routes';
import { assetRewriter, siteHrefRewriter } from './inline-styles';
import type { OperationRef } from './mdx-components';
import { PageRenderer } from './render';

export interface ApiReference {
  tab: DocsTab;
  /** URL segment, e.g. `api-reference`. */
  slug: string;
  model: OpenApiModel;
  tree: OpenApiNavTree;
}

export interface Site {
  config: DocsConfig;
  api: ApiReference | null;
  blog: BlogPost[];
  changelog: ChangelogEntry[];
  routes: SiteRoute[];
  byPath: Map<string, SiteRoute>;
  link: Linker;
  /** Operation lookup for `<ApiLink>`; null without an API Reference. */
  operation: ((operationId: string) => OperationRef | null) | null;
  /** A renderer for one page's MDX and operation HTML. */
  renderer: () => PageRenderer;
  /** A docs.json asset path (logo, favicon) as the browser should request it, under Astro's `base`. */
  asset: (path: string) => string;
  /**
   * A docs.json href (navbar link, anchor, CTA, sidebar link) as readers
   * follow it: docs pages through `link`, other site-root paths under
   * Astro's `base`, everything else as written.
   */
  href: (href: string) => string;
}

export class ContentError extends Error {
  override name = 'InkformContentError';
}

async function loadApi(docs: DocsConfig): Promise<ApiReference | null> {
  const tab = apiTab(docs);
  const slug = apiTabSlug(docs);
  if (!tab?.openapi || !slug) return null;
  if (tab.apiReference?.renderer === 'scalar') {
    console.warn(
      `[@inkform/astro] The "${tab.tab}" tab asks for the Scalar renderer, which the Astro integration doesn't ship. Its pages use the native renderer instead.`,
    );
  }
  const spec = await loadOpenApiSpecForBuild(tab.openapi);
  if (!spec) {
    throw new ContentError(`Couldn't load the OpenAPI spec "${tab.openapi}" named by the "${tab.tab}" tab in docs.json.`);
  }
  const [model, { schema }] = await Promise.all([
    parseOpenApi(spec.raw, spec.format),
    parseOpenApiDocument(spec.raw, { format: spec.format }),
  ]);
  // Without a spec operationId, the nav tree and the model name an operation
  // differently (`get-/plants/{id}` vs `get-plantsid`). URLs use the model's
  // id, which is what findOperation() looks up, so the tree adopts it.
  const ids = new Map(model.operations.map((op) => [`${op.method} ${op.path}`, op.operationId]));
  const tree = buildNavTree(schema);
  for (const group of tree.tagGroups) {
    for (const op of group.operations) op.operationId = ids.get(`${op.method} ${op.path}`) ?? op.operationId;
  }
  return { tab, slug, model, tree };
}

async function readSite(): Promise<Site> {
  process.env.DOCS_CONTENT_ROOT = config.contentRoot;
  const docs = loadDocsConfig();
  if (!docs) {
    throw new ContentError(
      `No docs.json found in ${config.contentRoot}/docs. Create one, or point the integration's \`contentRoot\` option at the folder that has docs/docs.json.`,
    );
  }

  const api = await loadApi(docs);
  const blog = loadBlogPosts();
  const changelog = loadChangelogEntries();
  const operationIds = api ? api.tree.tagGroups.flatMap((g) => g.operations.map((op) => op.operationId)) : [];

  const routes = buildRoutes({
    config: docs,
    apiSlug: api?.slug ?? null,
    operationIds,
    blogSlugs: blog.map((p) => p.slug),
    hasChangelog: changelog.length > 0,
  });
  const link = createLinker(config.publicBase, config.trailingSlash);

  const operation = api
    ? (operationId: string): OperationRef | null => {
        const op: ApiOperation | null = findOperation(api.model, operationId);
        return op ? { href: link(operationPath(api.slug, op.operationId)), summary: op.summary } : null;
      }
    : null;

  const byPath = routeIndex(routes);
  const rewriteHref = siteHrefRewriter(new Set(byPath.keys()), link, {
    base: config.base,
    siteBase: config.siteBase,
    trailingSlash: config.trailingSlash,
  });
  const rewriteSrc = assetRewriter(config.siteBase);
  const renderer = () => new PageRenderer({ mermaid: config.mermaid, operation, rewriteHref, rewriteSrc });
  const asset = (path: string) => rewriteSrc(path) ?? path;
  const href = (value: string) => rewriteHref(value) ?? value;

  return { config: docs, api, blog, changelog, routes, byPath, link, operation, renderer, asset, href };
}

let cached: Promise<Site> | null = null;

/**
 * The site, read once per build. In `astro dev` it's read again on every
 * request, so edits to docs.json, MDX files and the spec show up on reload.
 */
export function loadSite(): Promise<Site> {
  if (import.meta.env.DEV) return readSite();
  cached ??= readSite();
  return cached;
}
