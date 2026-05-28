import type { BlogPost, ChangelogEntry } from './content';
import type { DocsConfig } from './nav';
import { listDocPages } from './nav';

/** A single entry in the build-time search index. */
export type SearchDoc = {
  title: string;
  url: string;
  section: 'blog' | 'docs' | 'changelog';
  excerpt: string;
};

/**
 * Assemble the build-time search index from loaded content. The result is a
 * small JSON array; the client SearchDialog loads it once and runs fuse.js
 * fuzzy search over it (no server round-trips, works offline).
 */
export function buildSearchIndex(input: {
  blog?: BlogPost[];
  changelog?: ChangelogEntry[];
  docs?: { config: DocsConfig | null; descriptions?: Record<string, string> };
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
  return out;
}
