/**
 * The route table for one docs site: every URL under the integration's base,
 * what it renders, and how links to it are written. Pure, so the whole table
 * is unit-tested from a docs.json and a list of operation ids.
 *
 * Paths here are relative to the base: `''` is the docs home,
 * `api-reference/operations/list-plants` an operation page.
 */

import type { DocsConfig, FlatDocPage } from '@inkform/framework/nav';
import { listDocPages } from '@inkform/framework/nav';
import { joinHref } from '@inkform/framework/routes';

export type SiteRoute =
  | { kind: 'doc'; path: string; page: FlatDocPage }
  | { kind: 'api-index'; path: string }
  | { kind: 'api-operation'; path: string; operationId: string }
  | { kind: 'blog-index'; path: string }
  | { kind: 'blog-post'; path: string; slug: string }
  | { kind: 'changelog'; path: string };

export type RouteKind = SiteRoute['kind'];

export interface RouteInputs {
  config: DocsConfig;
  /** URL segment of the API Reference tab, or null for no API pages. */
  apiSlug: string | null;
  operationIds: string[];
  blogSlugs: string[];
  hasChangelog: boolean;
}

export const BLOG_PATH = 'blog';
export const CHANGELOG_PATH = 'changelog';

export function operationPath(apiSlug: string, operationId: string): string {
  return `${apiSlug}/operations/${operationId}`;
}

export class RouteConflictError extends Error {
  override name = 'RouteConflictError';
}

/**
 * Every page under the base, in nav order: doc pages first, then the API
 * Reference, blog and changelog. Two sources claiming one URL (a doc page with
 * slug `blog` next to a blog folder, say) is a build error that names both,
 * rather than one page silently replacing the other.
 */
export function buildRoutes({ config, apiSlug, operationIds, blogSlugs, hasChangelog }: RouteInputs): SiteRoute[] {
  const routes: SiteRoute[] = [];
  const owner = new Map<string, string>();

  const add = (route: SiteRoute, label: string) => {
    const existing = owner.get(route.path);
    if (existing) {
      // The same doc listed twice in docs.json (in two groups, say) is one page.
      if (existing === label) return;
      throw new RouteConflictError(`"${route.path || '/'}" is claimed by both ${existing} and ${label}. Rename one of them.`);
    }
    owner.set(route.path, label);
    routes.push(route);
  };

  for (const page of listDocPages(config)) {
    add({ kind: 'doc', path: page.slug, page }, `the doc page ${page.file}`);
  }

  if (apiSlug) {
    add({ kind: 'api-index', path: apiSlug }, 'the API Reference');
    for (const operationId of operationIds) {
      add({ kind: 'api-operation', path: operationPath(apiSlug, operationId), operationId }, `the operation ${operationId}`);
    }
  }

  if (blogSlugs.length > 0) {
    add({ kind: 'blog-index', path: BLOG_PATH }, 'the blog');
    for (const slug of blogSlugs) {
      add({ kind: 'blog-post', path: `${BLOG_PATH}/${slug}`, slug }, `the blog post ${slug}`);
    }
  }

  if (hasChangelog) add({ kind: 'changelog', path: CHANGELOG_PATH }, 'the changelog');

  return routes;
}

/** Astro's `[...slug]` param for a path: `undefined` for the docs home. */
export function slugParam(path: string): string | undefined {
  return path === '' ? undefined : path;
}

/** Index the table by path for lookups from a request's `slug` param. */
export function routeIndex(routes: SiteRoute[]): Map<string, SiteRoute> {
  return new Map(routes.map((r) => [r.path, r]));
}

export function findRoute(index: Map<string, SiteRoute>, slug: string | undefined): SiteRoute | null {
  const path = (slug ?? '').replace(/^\/+|\/+$/g, '');
  return index.get(path) ?? null;
}

export type TrailingSlash = 'always' | 'never' | 'ignore';

/** A function that turns a base-relative path into the href readers follow. */
export type Linker = (path: string) => string;

/**
 * Builds hrefs under `publicBase`, honoring Astro's `trailingSlash`. Fragments
 * and queries on `path` stay at the end: `('a#b')` → `/docs/a#b` (or `/docs/a/#b`).
 */
export function createLinker(publicBase: string, trailingSlash: TrailingSlash): Linker {
  return (path: string) => {
    const cut = path.search(/[?#]/);
    const bare = cut === -1 ? path : path.slice(0, cut);
    const rest = cut === -1 ? '' : path.slice(cut);
    let href = joinHref(publicBase, bare);
    if (trailingSlash === 'always' && !href.endsWith('/')) href += '/';
    return href + rest;
  };
}
