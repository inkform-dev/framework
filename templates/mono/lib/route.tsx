/**
 * lib/route.ts — Aurora routing core.
 *
 * Resolves a slug array from the catch-all route into either a doc page or an
 * API operation, generates static params, and builds sidebar groups for both
 * content types.
 */

import type { ReactNode } from 'react';
import {
  docTabs,
  listDocPages,
  findDocPage,
  tabNavigation,
  parseOpenApi,
  operationNavGroups,
  findOperation,
} from '@freewrite-cms/framework';
import type {
  DocsConfig,
  DocsTab,
  FlatDocPage,
  OpenApiModel,
  ApiOperation,
} from '@freewrite-cms/framework';
import { loadDocsConfig, loadDocPage, loadOpenApiSpec, slugify } from '@freewrite-cms/framework/content';
import type { SidebarGroup, SidebarItem } from '@freewrite-cms/framework/docs-shell';

// ── Re-export for convenience ─────────────────────────────────────────────────

export { loadDocsConfig, loadDocPage };

// ── API tab helpers ───────────────────────────────────────────────────────────

/** Find the tab that has an openapi spec (the API Reference tab). */
function apiTab(config: DocsConfig): DocsTab | null {
  return docTabs(config).find((t) => !!t.openapi) ?? null;
}

/**
 * The URL slug base for the API Reference tab, derived from slugifying its
 * tab label (e.g. "API Reference" → "api-reference").
 */
export function apiBasePath(config: DocsConfig): string | null {
  const tab = apiTab(config);
  if (!tab) return null;
  return slugify(tab.tab);
}

// ── Route resolution ──────────────────────────────────────────────────────────

export type DocRoute = {
  kind: 'doc';
  ref: FlatDocPage;
  page: { data: Record<string, unknown>; content: string };
  config: DocsConfig;
  tab: DocsTab;
};

export type ApiIndexRoute = {
  kind: 'api-index';
  model: OpenApiModel;
  tab: DocsTab;
  config: DocsConfig;
};

export type ApiRoute = {
  kind: 'api';
  operation: ApiOperation;
  model: OpenApiModel;
  tab: DocsTab;
  config: DocsConfig;
};

export type ResolvedRoute = DocRoute | ApiIndexRoute | ApiRoute;

/**
 * Resolve a catch-all slug array to a route descriptor.
 * Returns null if no page/operation is found (→ notFound()).
 */
export function resolveRoute(slugParts: string[] | undefined): ResolvedRoute | null {
  const config = loadDocsConfig();
  if (!config) return null;

  const path = (slugParts ?? []).join('/');
  const apiBase = apiBasePath(config);
  const tab = apiTab(config);

  // ── API Reference routes ──────────────────────────────────────────────────
  if (apiBase && tab && tab.openapi && (path === apiBase || path.startsWith(apiBase + '/'))) {
    const spec = loadOpenApiSpec(tab.openapi);
    if (!spec) return null;
    const model = parseOpenApi(spec.raw, spec.format);

    const opId = path.slice(apiBase.length).replace(/^\//, '');
    if (!opId) {
      // API index — redirect to first operation or show intro
      return { kind: 'api-index', model, tab, config };
    }

    const operation = findOperation(model, opId);
    if (!operation) return null;
    return { kind: 'api', operation, model, tab, config };
  }

  // ── Doc routes ────────────────────────────────────────────────────────────
  const ref = findDocPage(config, path);
  if (!ref) return null;

  const page = loadDocPage(ref.file);
  if (!page) return null;

  const docTabEntry = docTabs(config).find((t) => t.tab === ref.tab) ?? docTabs(config)[0];
  return { kind: 'doc', ref, page, config, tab: docTabEntry };
}

// ── Static params ─────────────────────────────────────────────────────────────

/**
 * All static slugs for generateStaticParams.
 * Each entry is a string[] (the catch-all segments).
 * The index page has slug = [] (empty array).
 */
export function listAllRoutes(config: DocsConfig): string[][] {
  const routes: string[][] = [];
  const seen = new Set<string>();

  function addSlug(slug: string) {
    if (seen.has(slug)) return;
    seen.add(slug);
    routes.push(slug === '' ? [] : slug.split('/'));
  }

  // Doc pages
  for (const page of listDocPages(config)) {
    addSlug(page.slug);
  }

  // API Reference routes
  const apiBase = apiBasePath(config);
  const tab = apiTab(config);
  if (apiBase && tab?.openapi) {
    addSlug(apiBase); // api index
    const spec = loadOpenApiSpec(tab.openapi);
    if (spec) {
      const model = parseOpenApi(spec.raw, spec.format);
      for (const op of model.operations) {
        addSlug(`${apiBase}/${op.operationId}`);
      }
    }
  }

  return routes;
}

// ── Sidebar builders ──────────────────────────────────────────────────────────

/**
 * Build SidebarGroup[] for a doc tab.
 * renderIcon maps a docs.json icon name to a ReactNode.
 */
export function sidebarForDoc(
  config: DocsConfig,
  tab: DocsTab,
  activeSlug: string,
  renderIcon: (name?: string) => ReactNode,
): SidebarGroup[] {
  const groups = tabNavigation(config, tab.tab);
  return groups.map((g) => ({
    group: g.group,
    icon: renderIcon(g.icon),
    items: (g.pages ?? []).map((p): SidebarItem => ({
      title: p.title,
      href: p.href ?? '/' + p.slug,
      active: p.slug === activeSlug,
      icon: renderIcon(p.icon),
      external: !!p.href,
    })),
  }));
}

/**
 * Build SidebarGroup[] for the API Reference tab.
 * Groups come from operationNavGroups; each item gets a method pill icon.
 */
export function sidebarForApi(
  model: OpenApiModel,
  apiBase: string,
  activeOpId: string | null,
): SidebarGroup[] {
  const navGroups = operationNavGroups(model);
  return navGroups.map((g) => ({
    group: g.group,
    items: g.items.map((item): SidebarItem => {
      const methodEl = (
        <span
          className={`fw-method-${item.method.toLowerCase()}`}
          style={{
            fontSize: '0.625rem',
            fontWeight: 700,
            fontFamily: 'var(--fw-mono)',
            letterSpacing: '0.05em',
            minWidth: '2.5rem',
            display: 'inline-block',
          }}
        >
          {item.method.toUpperCase()}
        </span>
      ) as ReactNode;

      return {
        title: item.summary,
        href: `/${apiBase}/${item.operationId}`,
        active: item.operationId === activeOpId,
        icon: methodEl,
      };
    }),
  }));
}
