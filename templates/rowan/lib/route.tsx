/**
 * lib/route.ts — Rowan routing core.
 *
 * Resolves a slug array from the catch-all route into a doc page, generates
 * static params, and builds sidebar groups. The API Reference tab is NOT
 * handled here — this project's tab has `apiReference.renderer: 'native'`
 * (docs.json), so it's served by app/api-reference/[[...slug]]/page.tsx,
 * the framework's own React/Galley renderer (@inkform/framework/openapi-render)
 * — no Scalar/Vue dependency. apiBasePath() is still needed by
 * components/top-bar.tsx to build that tab's nav link.
 *
 * Rowan-specific addition: sidebarFlat() + loadApiNavTree() below. Rowan has
 * no Guides|API-Reference tab switcher — one flat sidebar mixes doc groups
 * and API operation groups on every page (doc pages AND operation pages),
 * matching the reference site (see components/top-bar.tsx's buildTopBar()
 * doc comment for why docs.json still declares two internal `tabs`).
 */

import { cache } from 'react';
import type { ReactNode } from 'react';
import { docTabs, listDocPages, findDocPage, tabNavigation } from '@inkform/framework';
import type { DocsConfig, DocsTab, FlatDocPage } from '@inkform/framework';
import {
  loadDocsConfig,
  loadDocPage,
  loadBlogPosts,
  loadChangelogEntries,
  loadOpenApiSpecForBuild,
  slugify,
} from '@inkform/framework/content';
import type { SidebarGroup, SidebarItem } from '@inkform/framework/docs-shell';
import { buildReferenceSidebarGroups } from '@inkform/framework/openapi-render';
import { parseOpenApiDocument } from '@inkform/framework/openapi-engine/parse';
import { buildNavTree } from '@inkform/framework/openapi-engine/nav';
import type { OpenApiNavTree } from '@inkform/framework/openapi-engine/nav';

// ── Re-export for convenience ─────────────────────────────────────────────────

export { loadDocsConfig, loadDocPage };

// ── Content nav links (Blog / Changelog) ──────────────────────────────────────

/**
 * Extends config.navbarLinks with "Blog" / "Changelog" entries, but only when
 * content actually exists under content/blog or content/changelog — a
 * docs-only site stays clean by default (see app/blog, app/changelog).
 */
export function withContentNavLinks(config: DocsConfig): DocsConfig {
  const extra: DocsConfig['navbarLinks'] = [];
  if (loadBlogPosts().length > 0) extra.push({ name: 'Blog', href: '/blog' });
  if (loadChangelogEntries().length > 0) extra.push({ name: 'Changelog', href: '/changelog' });
  if (extra.length === 0) return config;
  return { ...config, navbarLinks: [...(config.navbarLinks ?? []), ...extra] };
}

// ── API tab helpers ───────────────────────────────────────────────────────────

/** Find the tab that has an openapi spec (the API Reference tab). */
export function apiTab(config: DocsConfig): DocsTab | null {
  return docTabs(config).find((t) => !!t.openapi) ?? null;
}

/**
 * The URL slug base for the API Reference tab, derived from slugifying its
 * tab label (e.g. "API Reference" → "api-reference"). Used by top-bar.tsx to
 * link to app/api-reference/route.ts — keep the two in sync if you rename
 * the tab.
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

/**
 * Resolve a catch-all slug array to a doc page descriptor.
 * Returns null if no page is found (→ notFound()).
 */
export function resolveRoute(slugParts: string[] | undefined): DocRoute | null {
  const config = loadDocsConfig();
  if (!config) return null;

  const path = (slugParts ?? []).join('/');
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

  for (const page of listDocPages(config)) {
    addSlug(page.slug);
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

// ── Rowan: flat sidebar (doc groups + API operation groups, no tab switch) ─────

export interface ApiNavData {
  /** Nav tree derived from the dereferenced spec — drives both the flat sidebar and generateStaticParams. */
  tree: OpenApiNavTree;
  /** The fully dereferenced document itself — operation pages need it to render Markdown for CopyPageButton. */
  schema: Record<string, unknown>;
}

/**
 * Loads + dereferences the API tab's OpenAPI spec once and derives its nav
 * tree. Shared by doc pages (sidebarFlat() needs API operations listed even
 * on non-API pages) and API reference pages (which also need the raw
 * schema — see renderOperationMarkdown usage in
 * app/api-reference/[[...slug]]/page.tsx). React's cache() dedupes this
 * within a render/build pass instead of re-parsing the same spec once per
 * doc page plus once per operation page — consolidating exactly the "second
 * native-renderer consumer" scenario the original aurora/birch
 * app/api-reference/[[...slug]]/page.tsx already flagged in a comment as
 * the natural next step.
 */
export const loadApiNavTree = cache(async (config: DocsConfig): Promise<ApiNavData | null> => {
  const tab = apiTab(config);
  if (!tab?.openapi || tab.apiReference?.renderer === 'scalar') return null;

  const spec = await loadOpenApiSpecForBuild(tab.openapi);
  if (!spec) return null;

  const { schema } = await parseOpenApiDocument(spec.raw, { format: spec.format });
  return { tree: buildNavTree(schema), schema };
});

/**
 * The single sidebar every Rowan page renders — doc groups first (from
 * whichever tab does NOT carry `openapi`), then the API tab's tag groups as
 * more sidebar groups, method-pill icons included (buildReferenceSidebarGroups,
 * the same adapter the framework's own <ReferenceSidebar> uses). Exactly one
 * of `active.slug` / `active.operationId` should be set, matching whichever
 * page is currently rendering.
 */
export function sidebarFlat(
  config: DocsConfig,
  renderIcon: (name?: string) => ReactNode,
  active: { slug?: string; operationId?: string },
  apiNav: ApiNavData | null,
): SidebarGroup[] {
  const guidesTab = docTabs(config).find((t) => !t.openapi) ?? docTabs(config)[0];
  const docGroups = sidebarForDoc(config, guidesTab, active.slug ?? '', renderIcon);
  if (!apiNav) return docGroups;

  const basePath = `/${apiBasePath(config) ?? 'api-reference'}`;
  const apiGroups = buildReferenceSidebarGroups(apiNav.tree, basePath, active.operationId);
  return [...docGroups, ...apiGroups];
}
