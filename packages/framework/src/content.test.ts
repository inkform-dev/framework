import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadBlogPosts, loadChangelogEntries, loadCollection } from './content';

let tmpRoot: string;
let prevContentRoot: string | undefined;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'inkform-content-test-'));
  prevContentRoot = process.env.DOCS_CONTENT_ROOT;
  process.env.DOCS_CONTENT_ROOT = tmpRoot;
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  if (prevContentRoot === undefined) delete process.env.DOCS_CONTENT_ROOT;
  else process.env.DOCS_CONTENT_ROOT = prevContentRoot;
});

function writeMdx(dir: string, file: string, frontmatter: string, body = 'Body.') {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), `---\n${frontmatter}\n---\n${body}\n`);
}

describe('loadBlogPosts date parsing', () => {
  it('reads an unquoted YAML date (parsed as a Date, not a string)', () => {
    const blogDir = path.join(tmpRoot, 'blog');
    writeMdx(blogDir, 'unquoted.mdx', 'title: Unquoted\ndate: 2026-01-25\nstatus: published');
    writeMdx(blogDir, 'quoted.mdx', "title: Quoted\ndate: '2026-01-20'\nstatus: published");

    const posts = loadBlogPosts();
    const bySlug = new Map(posts.map((p) => [p.slug, p]));

    expect(bySlug.get('unquoted')?.date).toBe('2026-01-25');
    expect(bySlug.get('quoted')?.date).toBe('2026-01-20');
    // Newest first — regression check for the '' sorting-last bug.
    expect(posts.map((p) => p.slug)).toEqual(['unquoted', 'quoted']);
  });

  it('falls back to an empty string for a genuinely missing date', () => {
    const blogDir = path.join(tmpRoot, 'blog');
    writeMdx(blogDir, 'no-date.mdx', 'title: No date\nstatus: published');
    const posts = loadBlogPosts();
    expect(posts[0].date).toBe('');
  });
});

describe('loadChangelogEntries date parsing', () => {
  it('reads an unquoted YAML date the same way as blog posts', () => {
    const changelogDir = path.join(tmpRoot, 'changelog');
    writeMdx(changelogDir, '2026-02-10-v2.mdx', 'title: v2\ndate: 2026-02-10\nstatus: published');
    const entries = loadChangelogEntries();
    expect(entries[0].date).toBe('2026-02-10');
  });
});

describe('loadCollection', () => {
  it('loads a folder of MDX sorted by file name, skipping _ files', () => {
    const dir = path.join(tmpRoot, 'podcast', 'episodes');
    writeMdx(dir, 'ep-02-second.mdx', 'title: Second\nnumber: 2');
    writeMdx(dir, 'ep-01-first.mdx', 'title: First\nnumber: 1\ndate: 2026-03-04', 'Show notes.');
    writeMdx(dir, '_example.mdx', 'title: Example\nnumber: 0');
    const entries = loadCollection('podcast/episodes');
    expect(entries.map((e) => e.slug)).toEqual(['ep-01-first', 'ep-02-second']);
    expect(entries[0].file).toBe('podcast/episodes/ep-01-first.mdx');
    expect(entries[0].content.trim()).toBe('Show notes.');
    expect(entries[0].readingTime).toBe(1);
    // gray-matter hands an unquoted YAML date through as a Date
    expect(entries[0].data.date).toBeInstanceOf(Date);
  });

  it('types and validates frontmatter through parse', () => {
    const dir = path.join(tmpRoot, 'notes');
    writeMdx(dir, 'a.mdx', 'title: A\ncredits: 3');
    const entries = loadCollection('notes', (data) => {
      if (typeof data.credits !== 'number') throw new Error('credits: expected a number');
      return { title: String(data.title), credits: data.credits };
    });
    expect(entries[0].data).toEqual({ title: 'A', credits: 3 });
  });

  it('names the file when parse throws', () => {
    const dir = path.join(tmpRoot, 'notes');
    writeMdx(dir, 'bad.mdx', 'title: Bad\ncredits: three');
    expect(() =>
      loadCollection('notes', (data) => {
        if (typeof data.credits !== 'number') throw new Error('credits: expected a number');
        return data;
      }),
    ).toThrow('Invalid frontmatter in content/notes/bad.mdx:\ncredits: expected a number');
  });

  it('returns an empty list for a missing folder', () => {
    expect(loadCollection('nope')).toEqual([]);
  });
});
