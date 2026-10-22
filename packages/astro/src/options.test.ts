import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { docsRoutePattern, normalizeBase, resolveOptions, type HostConfig } from './options';

const host: HostConfig = { root: '/site', siteBase: '/', trailingSlash: 'ignore', csp: false };

describe('normalizeBase', () => {
  it('normalizes slashes', () => {
    expect(normalizeBase('/docs/')).toBe('/docs');
    expect(normalizeBase('docs')).toBe('/docs');
    expect(normalizeBase('//help//center/')).toBe('/help/center');
  });

  it('maps the root to an empty base', () => {
    expect(normalizeBase('/')).toBe('');
    expect(normalizeBase('')).toBe('');
  });

  it('rejects URLs, queries and dot segments', () => {
    expect(() => normalizeBase('https://x.dev/docs')).toThrow(/path like/);
    expect(() => normalizeBase('/docs?x=1')).toThrow(/path like/);
    expect(() => normalizeBase('/docs/../x')).toThrow(/"\." or "\.\."/);
  });
});

describe('resolveOptions', () => {
  it('defaults to /docs, ./content, galley, search on, mermaid off', () => {
    const r = resolveOptions({}, host);
    expect(r).toMatchObject({
      base: '/docs',
      siteBase: '',
      publicBase: '/docs',
      contentRoot: path.resolve('/site', 'content'),
      theme: 'galley',
      customCss: [],
      search: true,
      mermaid: false,
      llmsTxt: true,
      csp: false,
      cspAlgorithm: 'SHA-256',
    });
  });

  it("puts Astro's own base in front of the public base", () => {
    expect(resolveOptions({ base: '/docs' }, { ...host, siteBase: '/app/' }).publicBase).toBe('/app/docs');
  });

  it('takes publicBase as given, for a host that rewrites another URL onto the docs', () => {
    const r = resolveOptions({ base: '/docs', publicBase: '/' }, host);
    expect(r.base).toBe('/docs');
    expect(r.publicBase).toBe('');
  });

  it('resolves content, theme and custom CSS paths against the project root', () => {
    const r = resolveOptions({ contentRoot: 'docs-content', theme: './src/docs-theme.css', customCss: ['fonts.css'] }, host);
    expect(r.contentRoot).toBe(path.resolve('/site', 'docs-content'));
    expect(r.theme).toBe(path.resolve('/site', 'src/docs-theme.css'));
    expect(r.customCss).toEqual([path.resolve('/site', 'fonts.css')]);
  });

  it('keeps built-in theme names', () => {
    expect(resolveOptions({ theme: 'plain' }, host).theme).toBe('plain');
  });

  it('carries the CSP settings through', () => {
    expect(resolveOptions({}, { ...host, csp: true, cspAlgorithm: 'SHA-384' })).toMatchObject({ csp: true, cspAlgorithm: 'SHA-384' });
  });
});

describe('docsRoutePattern', () => {
  it('is a rest route under the base', () => {
    expect(docsRoutePattern('/docs')).toBe('/docs/[...slug]');
    expect(docsRoutePattern('')).toBe('/[...slug]');
  });
});
