import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildSearchIndex, pageUrl } from './search-index';

describe('pageUrl', () => {
  it('maps built files to the URLs readers use', () => {
    expect(pageUrl('index.html', '/docs', 'ignore')).toBe('/docs');
    expect(pageUrl(path.join('quickstart', 'index.html'), '/docs', 'ignore')).toBe('/docs/quickstart');
    expect(pageUrl(path.join('a', 'b.html'), '/docs', 'ignore')).toBe('/docs/a/b');
    expect(pageUrl(path.join('quickstart', 'index.html'), '', 'ignore')).toBe('/quickstart');
    expect(pageUrl(path.join('quickstart', 'index.html'), '/docs', 'always')).toBe('/docs/quickstart/');
    // Under Astro's base, publicBase carries it.
    expect(pageUrl('index.html', '/sub/docs', 'always')).toBe('/sub/docs/');
    expect(pageUrl(path.join('quickstart', 'index.html'), '/sub/docs', 'always')).toBe('/sub/docs/quickstart/');
  });
});

describe('buildSearchIndex', () => {
  let out: string;
  beforeEach(() => {
    out = mkdtempSync(path.join(os.tmpdir(), 'inkform-search-'));
  });
  afterEach(() => rmSync(out, { recursive: true, force: true }));

  const page = (title: string, body: string) =>
    `<!doctype html><html><head><title>${title}</title></head><body><nav>Chrome</nav><main data-pagefind-body><h1>${title}</h1><p>${body}</p></main></body></html>`;

  it('indexes the docs pages under the base and writes the index beside them', async () => {
    mkdirSync(path.join(out, 'docs', 'quickstart'), { recursive: true });
    writeFileSync(path.join(out, 'docs', 'index.html'), page('Home', 'Welcome'));
    writeFileSync(path.join(out, 'docs', 'quickstart', 'index.html'), page('Quickstart', 'Install the package'));
    writeFileSync(path.join(out, 'index.html'), page('Host', 'Not ours'));

    const result = await buildSearchIndex({ outDir: out, base: '/docs', publicBase: '/docs', trailingSlash: 'ignore' });
    expect(result.pages).toBe(2);
    expect(result.outputPath).toBe(path.join(out, 'docs', '_pagefind'));
    expect(existsSync(path.join(out, 'docs', '_pagefind', 'pagefind.js'))).toBe(true);
    expect(existsSync(path.join(out, 'docs', '_pagefind', 'pagefind-entry.json'))).toBe(true);
    expect(existsSync(path.join(out, '_pagefind'))).toBe(false);
  });

  it('writes every index file in full, build after build', async () => {
    mkdirSync(path.join(out, 'docs', 'a'), { recursive: true });
    writeFileSync(path.join(out, 'docs', 'index.html'), page('Home', 'Welcome'));
    writeFileSync(path.join(out, 'docs', 'a', 'index.html'), page('A', 'Alpha'));
    // Pagefind's writeFiles() left empty files about one run in four; the
    // index is written from getFiles() instead. Several runs make a
    // regression likely to show.
    for (let run = 0; run < 6; run++) {
      const { outputPath } = await buildSearchIndex({ outDir: out, base: '/docs', publicBase: '/docs', trailingSlash: 'ignore' });
      const empty = readdirSync(outputPath, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile() && statSync(path.join(e.parentPath, e.name)).size === 0)
        .map((e) => e.name);
      expect(empty, `run ${run}`).toEqual([]);
    }
  });

  it('does nothing when there are no pages', async () => {
    const result = await buildSearchIndex({ outDir: out, base: '/docs', publicBase: '/docs', trailingSlash: 'ignore' });
    expect(result.pages).toBe(0);
  });
});
