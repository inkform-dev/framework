/**
 * docs.json → URLs, without any framework's router in the way. Pure, no IO:
 * the Next.js themes keep their own lib/route.tsx, and hosts that aren't
 * Next.js (the Astro integration) build their route tables from these.
 */

import { docTabs, listDocPages } from './nav';
import type { DocsConfig, DocsTab } from './nav';
import { slugify } from './slug';

/** The tab that carries an OpenAPI spec (the API Reference tab), or null. */
export function apiTab(config: DocsConfig): DocsTab | null {
  return docTabs(config).find((t) => !!t.openapi) ?? null;
}

/**
 * The API Reference tab's URL segment: its label, slugified ("API Reference"
 * → "api-reference"). The same rule every theme's `apiBasePath()` uses, so
 * operation URLs (`<segment>/operations/<operationId>`) match across hosts.
 * Null when there is no API tab.
 */
export function apiTabSlug(config: DocsConfig): string | null {
  const tab = apiTab(config);
  return tab ? slugify(tab.tab) : null;
}

/** Every doc page slug in nav order, without duplicates. `''` is the index page. */
export function docRouteSlugs(config: DocsConfig): string[] {
  return [...new Set(listDocPages(config).map((p) => p.slug))];
}

/**
 * Joins a base path and a slug into an href: `('/docs', 'a/b')` → `/docs/a/b`,
 * `('/docs', '')` → `/docs`, `('', '')` → `/`. Extra slashes on either side are
 * dropped, so `'/docs/'` and `'/a/'` join cleanly.
 */
export function joinHref(base: string, slug: string): string {
  const b = base.replace(/\/+$/, '');
  const s = slug.replace(/^\/+|\/+$/g, '');
  if (!s) return b || '/';
  return `${b}/${s}`;
}
