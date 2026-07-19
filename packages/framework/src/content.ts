import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { DocsConfig } from './nav';

/**
 * Build-time content loaders. Read your site's content from the deployed repo:
 * MDX files with frontmatter, plus the `docs.json` navigation config,
 * `series.json`, and `slug-history.json`. The content root defaults to
 * `<project>/content`; override it with `DOCS_CONTENT_ROOT`.
 *
 * The config file is `docs.json` (the standard). For backward compatibility a
 * `freewrite.json` with the same shape is also accepted, and the legacy
 * `INKFORM_CONTENT_ROOT` env var still works as a content-root override.
 * `inkform.json` is reserved/unused — do not read or write it here.
 */

export function contentRoot(): string {
  // Content lives under <project>/content/{docs,blog,changelog}. Override the
  // whole root with DOCS_CONTENT_ROOT (e.g. to read from the repo root).
  return (
    process.env.DOCS_CONTENT_ROOT ||
    process.env.INKFORM_CONTENT_ROOT ||
    path.join(process.cwd(), 'content')
  );
}

function readFileSafe(abs: string): string | null {
  try {
    return fs.readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
}

function listMdx(dirAbs: string): string[] {
  try {
    return fs
      .readdirSync(dirAbs)
      .filter((f) => f.endsWith('.mdx'))
      .sort();
  } catch {
    return [];
  }
}

function readMdx(abs: string): { data: Record<string, unknown>; content: string } | null {
  const raw = readFileSafe(abs);
  if (raw == null) return null;
  const { data, content } = matter(raw);
  return { data: data ?? {}, content };
}

export function readingTimeMinutes(content: string): number {
  const words = content.replace(/[#>*_`[\]()-]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function plainExcerpt(content: string, max = 200): string {
  const text = content
    .replace(/^---[\s\S]*?---/, '')
    .replace(/[#>*_`~[\]]|\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

// ── blog ──────────────────────────────────────────────────────────────────

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  author: string | null;
  tags: string[];
  status: string;
  series: string | null;
  description: string | null;
  coverImage: string | null;
  /** Social-share image override (falls back to coverImage if unset) — CMS frontmatter field `ogImage`. */
  ogImage: string | null;
  /** Social-share title override (falls back to title if unset) — CMS frontmatter field `ogTitle`. */
  ogTitle: string | null;
  excerpt: string;
  readingTime: number;
  content: string;
};

function toBlogPost(fileSlug: string, data: Record<string, unknown>, content: string): BlogPost {
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
  return {
    slug: str(data.slug) ?? fileSlug,
    title: str(data.title) ?? 'Untitled',
    date: typeof data.date === 'string' ? data.date.slice(0, 10) : '',
    author: str(data.author),
    tags: Array.isArray(data.tags) ? (data.tags.filter((t) => typeof t === 'string') as string[]) : [],
    status: str(data.status) ?? 'published',
    series: str(data.series),
    description: str(data.description),
    coverImage: str(data.coverImage),
    ogImage: str(data.ogImage),
    ogTitle: str(data.ogTitle),
    excerpt: plainExcerpt(content),
    readingTime: readingTimeMinutes(content),
    content,
  };
}

function isLive(status: string, date: string): boolean {
  if (status === 'published') return true;
  if (status === 'scheduled') return date <= new Date().toISOString().slice(0, 10);
  return false;
}

export function loadBlogPosts(dir = 'blog', includeUnpublished = false): BlogPost[] {
  const base = path.join(contentRoot(), dir);
  const posts = listMdx(base)
    .map((f) => {
      const parsed = readMdx(path.join(base, f));
      if (!parsed) return null;
      return toBlogPost(f.replace(/\.mdx$/, ''), parsed.data, parsed.content);
    })
    .filter((p): p is BlogPost => p !== null)
    .filter((p) => includeUnpublished || isLive(p.status, p.date))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

export function loadBlogPost(slug: string, dir = 'blog'): BlogPost | null {
  const abs = path.join(contentRoot(), dir, `${slug}.mdx`);
  const parsed = readMdx(abs);
  if (!parsed) return null;
  return toBlogPost(slug, parsed.data, parsed.content);
}

export type SeriesEntry = { slug: string; title: string; description: string | null; posts: string[] };
export function loadSeries(dir = 'blog'): SeriesEntry[] {
  const raw = readFileSafe(path.join(contentRoot(), dir, 'series.json'));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { series?: SeriesEntry[] };
    return Array.isArray(parsed.series) ? parsed.series : [];
  } catch {
    return [];
  }
}

// ── changelog ───────────────────────────────────────────────────────────────

export type ChangelogEntry = {
  slug: string;
  title: string;
  date: string;
  version: string | null;
  tags: string[];
  status: string;
  excerpt: string;
  content: string;
};

export function loadChangelogEntries(dir = 'changelog', includeDrafts = false): ChangelogEntry[] {
  const base = path.join(contentRoot(), dir);
  return listMdx(base)
    .map((f): ChangelogEntry | null => {
      const parsed = readMdx(path.join(base, f));
      if (!parsed) return null;
      const d = parsed.data;
      const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
      const date = typeof d.date === 'string' ? d.date.slice(0, 10) : '';
      const status = str(d.status) ?? 'published';
      return {
        slug: f.replace(/\.mdx$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''),
        title: str(d.title) ?? 'Untitled',
        date,
        version: str(d.version),
        tags: Array.isArray(d.tags) ? (d.tags.filter((t) => typeof t === 'string') as string[]) : [],
        status,
        excerpt: plainExcerpt(parsed.content),
        content: parsed.content,
      };
    })
    .filter((e): e is ChangelogEntry => e !== null)
    .filter((e) => includeDrafts || isLive(e.status, e.date))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ── docs ──────────────────────────────────────────────────────────────────

export function loadDocsConfig(dir = 'docs'): DocsConfig | null {
  // `docs.json` is the standard; `freewrite.json` is accepted for back-compat.
  const raw =
    readFileSafe(path.join(contentRoot(), dir, 'docs.json')) ??
    readFileSafe(path.join(contentRoot(), dir, 'freewrite.json'));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DocsConfig;
  } catch {
    return null;
  }
}

/**
 * Read an OpenAPI spec (JSON or YAML) for the API Reference. `file` is resolved
 * relative to `content/<dir>` — typically the `openapi` field of docs.json
 * (e.g. `openapi.json` or `api/openapi.yaml`). Returns the raw text plus the
 * detected format; pass both to `parseOpenApi()` from `@inkform/framework`.
 */
export function loadOpenApiSpec(
  file: string,
  dir = 'docs',
): { raw: string; format: 'json' | 'yaml' } | null {
  const abs = path.isAbsolute(file) ? file : path.join(contentRoot(), dir, file);
  const raw = readFileSafe(abs);
  if (raw == null) return null;
  const format: 'json' | 'yaml' = /\.ya?ml$/i.test(abs) ? 'yaml' : 'json';
  return { raw, format };
}

/**
 * Resolves a `DocsTab.openapi` value (docs.json's spec-source config key) to
 * whichever shape the Scalar API Reference config expects: a `url` a project
 * points at a spec it hosts itself (Scalar's own client fetches it — nothing
 * to read locally), or `content` — the raw text of a local file under
 * `content/<dir>` (the existing, pre-Scalar behavior). Returns null if the
 * tab has no `openapi` set, or a local file is configured but missing.
 */
export function resolveOpenApiSource(
  openapi: string | undefined,
  dir = 'docs',
): { url: string } | { content: string } | null {
  if (!openapi) return null;
  if (/^https?:\/\//i.test(openapi)) return { url: openapi };
  const spec = loadOpenApiSpec(openapi, dir);
  return spec ? { content: spec.raw } : null;
}

/**
 * Like loadOpenApiSpec, but also handles a URL spec source by fetching it at
 * build time — used where the actual parsed spec is needed inside the
 * Next.js build itself (e.g. ApiLink's cross-link validation), unlike
 * resolveOpenApiSource's `{ url }` shape, which hands the URL to Scalar's own
 * client-side fetch instead of reading it here.
 */
export async function loadOpenApiSpecForBuild(
  openapi: string,
  dir = 'docs',
): Promise<{ raw: string; format: 'json' | 'yaml' } | null> {
  if (!/^https?:\/\//i.test(openapi)) return loadOpenApiSpec(openapi, dir);
  try {
    const res = await fetch(openapi);
    if (!res.ok) return null;
    const raw = await res.text();
    const format: 'json' | 'yaml' = /\.ya?ml$/i.test(openapi) ? 'yaml' : 'json';
    return { raw, format };
  } catch {
    return null;
  }
}

export function loadDocPage(file: string, dir = 'docs'): { data: Record<string, unknown>; content: string } | null {
  return readMdx(path.join(contentRoot(), dir, file));
}

export function loadSlugHistory(dir = 'docs'): Record<string, string> {
  const raw = readFileSafe(path.join(contentRoot(), dir, 'slug-history.json'));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) if (typeof v === 'string') out[k] = v;
    return out;
  } catch {
    return {};
  }
}

// ── headings / table of contents ─────────────────────────────────────────────

export type Heading = { depth: number; text: string; slug: string };

/** Slugify a heading the same way `rehype-slug`/GitHub do, for anchor links. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Extract `##`/`###` headings from MDX for the on-this-page table of contents.
 * Skips fenced code blocks and front-matter. Pure — no IO.
 */
export function extractHeadings(content: string, minDepth = 2, maxDepth = 3): Heading[] {
  const body = content.replace(/^---[\s\S]*?\n---\n/, '');
  const out: Heading[] = [];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (!m) continue;
    const depth = m[1].length;
    if (depth < minDepth || depth > maxDepth) continue;
    const text = m[2].replace(/[*_`~]/g, '').trim();
    out.push({ depth, text, slug: slugify(text) });
  }
  return out;
}
