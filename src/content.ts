import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { DocsConfig } from './nav';

/**
 * Build-time content loaders. Read the same files the Freewrite CMS editor
 * commits — MDX with frontmatter, plus freewrite.json / series.json /
 * slug-history.json — from the deployed repo. The content root defaults to the
 * project cwd; override with FREEWRITE_CONTENT_ROOT.
 */

export function contentRoot(): string {
  // Content lives under <project>/content/{blog,docs,changelog}. Override the
  // whole root with FREEWRITE_CONTENT_ROOT (e.g. to read from the repo root).
  return process.env.FREEWRITE_CONTENT_ROOT || path.join(process.cwd(), 'content');
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
  const raw = readFileSafe(path.join(contentRoot(), dir, 'freewrite.json'));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DocsConfig;
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
