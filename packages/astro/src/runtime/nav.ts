/**
 * Navigation data for the shell: sidebar groups, the header's tab row,
 * breadcrumbs and prev/next links. Pure, so every link the shell prints is
 * unit-tested; the Astro components only turn these into markup.
 */

import type { DocsConfig, DocsNavPage, FlatDocPage } from '@inkform/framework/nav';
import { docNeighbours, docTabs, listDocPages } from '@inkform/framework/nav';
import type { HttpMethod, OpenApiNavTree } from '@inkform/framework/openapi-engine/nav';
import { BLOG_PATH, CHANGELOG_PATH, operationPath, type Linker } from './routes';

export interface NavItem {
  title: string;
  href: string;
  active: boolean;
  /** 0 for a group's own pages, 1 for their children, and so on. */
  depth: number;
  external: boolean;
  /** docs.json icon name, if any. */
  icon?: string;
  /** HTTP method, for API Reference entries. */
  method?: HttpMethod;
}

export interface NavGroup {
  group: string;
  icon?: string;
  items: NavItem[];
}

const isExternal = (href: string) => /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//');

/** Sidebar groups for one docs tab. Nested `children` follow their parent, one depth level deeper. */
export function docsSidebar(config: DocsConfig, tabName: string, activeSlug: string | null, link: Linker): NavGroup[] {
  const tab = docTabs(config).find((t) => t.tab === tabName) ?? docTabs(config)[0];
  return (tab?.navigation ?? []).map((g) => {
    const items: NavItem[] = [];
    const walk = (pages: DocsNavPage[], depth: number) => {
      for (const p of pages) {
        const external = !!p.href && isExternal(p.href);
        items.push({
          title: p.title,
          // A page with its own `href` is a link out, used as written.
          href: p.href ?? link(p.slug),
          active: !p.href && p.slug === activeSlug,
          depth,
          external,
          icon: p.icon,
        });
        if (p.children?.length) walk(p.children, depth + 1);
      }
    };
    walk(g.pages ?? [], 0);
    return { group: g.group, icon: g.icon, items };
  });
}

/** Sidebar groups for the API Reference: one group per tag, an entry per operation. */
export function apiSidebar(tree: OpenApiNavTree, apiSlug: string, activeOperationId: string | null, link: Linker): NavGroup[] {
  return tree.tagGroups.map((g) => ({
    group: g.tag,
    items: g.operations.map((op) => ({
      title: op.summary || op.operationId,
      href: link(operationPath(apiSlug, op.operationId)),
      active: op.operationId === activeOperationId,
      depth: 0,
      external: false,
      method: op.method,
    })),
  }));
}

export interface TopNavLink {
  label: string;
  href: string;
  active: boolean;
  external: boolean;
}

export type ActiveArea = { kind: 'docs'; tab: string } | { kind: 'api' } | { kind: 'blog' } | { kind: 'changelog' };

/**
 * The header row: one link per docs.json tab (a docs tab opens its first page,
 * the API tab its reference), then anchors and navbar links (anchors win when
 * both name the same URL), then Blog and Changelog when the site has them.
 */
export function topNav(
  config: DocsConfig,
  options: { apiSlug: string | null; hasBlog: boolean; hasChangelog: boolean; active: ActiveArea; link: Linker },
): TopNavLink[] {
  const { apiSlug, hasBlog, hasChangelog, active, link } = options;
  const out: TopNavLink[] = [];

  for (const t of docTabs(config)) {
    if (t.openapi) {
      if (!apiSlug) continue;
      out.push({ label: t.tab, href: link(apiSlug), active: active.kind === 'api', external: false });
      continue;
    }
    const first = listDocPages(config, t.tab)[0];
    out.push({
      label: t.tab,
      href: link(first?.slug ?? ''),
      active: active.kind === 'docs' && active.tab === t.tab,
      external: false,
    });
  }

  const seen = new Set<string>();
  for (const l of [...(config.anchors ?? []), ...(config.navbarLinks ?? [])]) {
    if (seen.has(l.href)) continue;
    seen.add(l.href);
    const external = isExternal(l.href);
    out.push({ label: l.name, href: l.href, active: false, external });
  }

  if (hasBlog) out.push({ label: 'Blog', href: link(BLOG_PATH), active: active.kind === 'blog', external: false });
  if (hasChangelog) {
    out.push({ label: 'Changelog', href: link(CHANGELOG_PATH), active: active.kind === 'changelog', external: false });
  }
  return out;
}

export interface Crumb {
  label: string;
  href?: string;
}

/** Group › parent pages › this page, for a doc page. */
export function docBreadcrumbs(config: DocsConfig, page: FlatDocPage, link: Linker): Crumb[] {
  const tab = docTabs(config).find((t) => t.tab === page.tab);
  const group = tab?.navigation?.find((g) => g.group === page.group);
  const trail: Crumb[] = [];
  if (group) trail.push({ label: group.group });

  const parents = (pages: DocsNavPage[], target: string, path: DocsNavPage[]): DocsNavPage[] | null => {
    for (const p of pages) {
      if (!p.href && p.slug === target) return path;
      if (p.children?.length) {
        const found = parents(p.children, target, [...path, p]);
        if (found) return found;
      }
    }
    return null;
  };
  for (const p of parents(group?.pages ?? [], page.slug, []) ?? []) {
    trail.push(p.href ? { label: p.title } : { label: p.title, href: link(p.slug) });
  }
  trail.push({ label: page.title });
  return trail;
}

export interface PageLink {
  title: string;
  href: string;
}

/** Previous and next pages within the page's own tab. */
export function docPagination(config: DocsConfig, slug: string, link: Linker): { prev: PageLink | null; next: PageLink | null } {
  const { prev, next } = docNeighbours(config, slug);
  return {
    prev: prev ? { title: prev.title, href: link(prev.slug) } : null,
    next: next ? { title: next.title, href: link(next.slug) } : null,
  };
}
