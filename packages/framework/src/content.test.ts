import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadBlogPosts, loadChangelogEntries } from './content';

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
