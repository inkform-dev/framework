import type { BlogPost, ChangelogEntry } from './content';
import type { DocsConfig } from './nav';
import { listDocPages } from './nav';
import type { OpenApiModel } from './openapi';

/** A single entry in the build-time search index. */
export type SearchDoc = {
  title: string;
  url: string;
  section: 'blog' | 'docs' | 'changelog' | 'api';
  excerpt: string;
};

/**
 * Assemble the build-time search index from loaded content. The result is a
 * small JSON array; the client SearchDialog loads it once and runs fuse.js
 * fuzzy search over it (no server round-trips, works offline).
 *
 * Pass `api` to make an OpenAPI-backed API Reference tab searchable: each
 * operation becomes one entry, matchable by summary, HTTP method, or path.
 */
export function buildSearchIndex(input: {
  blog?: BlogPost[];
  changelog?: ChangelogEntry[];
  docs?: { config: DocsConfig | null; descriptions?: Record<string, string> };
  /** OpenAPI operations to index. `basePath` is the API tab's URL base, e.g. `/api-reference`. */
  api?: { model: OpenApiModel; basePath: string };
  basePaths?: { blog?: string; docs?: string; changelog?: string };
}): SearchDoc[] {
  const base = { blog: '/blog', docs: '/docs', changelog: '/changelog', ...input.basePaths };
  const out: SearchDoc[] = [];

  for (const p of input.blog ?? []) {
    out.push({ title: p.title, url: `${base.blog}/${p.slug}`, section: 'blog', excerpt: p.description ?? p.excerpt });
  }
  for (const e of input.changelog ?? []) {
    out.push({ title: e.title, url: `${base.changelog}#${e.slug}`, section: 'changelog', excerpt: e.excerpt });
  }
  if (input.docs?.config) {
    for (const page of listDocPages(input.docs.config)) {
      out.push({
        title: page.title,
        url: `${base.docs}/${page.slug}`,
        section: 'docs',
        excerpt: input.docs.descriptions?.[page.slug] ?? '',
      });
    }
  }
  if (input.api) {
    const apiBase = input.api.basePath.replace(/\/$/, '');
    for (const op of input.api.model.operations) {
      out.push({
        title: op.summary || op.operationId,
        url: `${apiBase}/${op.operationId}`,
        section: 'api',
        excerpt: `${op.method.toUpperCase()} ${op.path}${op.description ? ' — ' + op.description : ''}`,
      });
    }
  }
  return out;
}
