import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { docsRoutePattern, needsReactJsx, normalizeBase, resolveOptions, type HostConfig } from './options';

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
  it('defaults to /docs, ./content, galley, search on, mermaid and credits off', () => {
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
      credits: false,
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

  it('resolves the components module against the project root, and has none by default', () => {
    expect(resolveOptions({}, host).components).toBeNull();
    expect(resolveOptions({ components: './src/mdx-components.tsx' }, host).components).toBe(path.resolve('/site', 'src/mdx-components.tsx'));
  });

  it('shows the credit only when asked', () => {
    expect(resolveOptions({ credits: true }, host).credits).toBe(true);
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

describe('needsReactJsx', () => {
  const tsx = '/site/src/mdx-components.tsx';

  it('compiles JSX for a .jsx/.tsx components module when nothing else in the site does', () => {
    expect(needsReactJsx(tsx, [{ name: '@inkform/astro' }], undefined)).toBe(true);
    expect(needsReactJsx('/site/src/c.jsx', [], undefined)).toBe(true);
  });

  it('leaves it alone without a JSX module, beside a UI integration, or when the site sets it', () => {
    expect(needsReactJsx(null, [], undefined)).toBe(false);
    expect(needsReactJsx('/site/src/c.ts', [], undefined)).toBe(false);
    expect(needsReactJsx(tsx, [{ name: '@astrojs/react' }], undefined)).toBe(false);
    expect(needsReactJsx(tsx, [{ name: '@astrojs/preact' }], undefined)).toBe(false);
    expect(needsReactJsx(tsx, [], 'preserve')).toBe(false);
  });
});
