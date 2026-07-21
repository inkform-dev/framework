/**
 * lib/route.ts — Meadow routing core.
 *
 * Resolves a slug array from the catch-all route into a doc page, generates
 * static params, and builds sidebar groups. The API Reference tab is NOT
 * handled here — this project's tab has `apiReference.renderer: 'native'`
 * (docs.json), so it's served by app/api-reference/[[...slug]]/page.tsx,
 * the framework's own React/Galley renderer (@inkform/framework/openapi-render)
 * — no Scalar/Vue dependency. apiBasePath() is still needed by
 * components/top-bar.tsx to build that tab's nav link.
 */

import type { ReactNode } from 'react';
import { docTabs, listDocPages, findDocPage, tabNavigation } from '@inkform/framework';
import type { DocsConfig, DocsTab, FlatDocPage } from '@inkform/framework';
import { loadDocsConfig, loadDocPage, loadBlogPosts, loadChangelogEntries, slugify } from '@inkform/framework/content';
import type { SidebarGroup, SidebarItem } from '@inkform/framework/docs-shell';

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
