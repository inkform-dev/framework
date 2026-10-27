import { describe, expect, it } from 'vitest';
import { assetRewriter, docsLinkRewriter, InlineStyleSheet, siteHrefRewriter, splitDeclarations } from './inline-styles';
import { createLinker } from './routes';

describe('splitDeclarations', () => {
  it('splits on top-level semicolons only', () => {
    expect(splitDeclarations('a: b; c: url("x;y"); d: e(f;g);')).toEqual(['a: b', 'c: url("x;y")', 'd: e(f;g)']);
    expect(splitDeclarations('  ')).toEqual([]);
  });
});

describe('InlineStyleSheet', () => {
  it('turns each distinct style into one class with !important rules', () => {
    const sheet = new InlineStyleSheet();
    const html = sheet.extract('<span class="a" style="--x:1;color:red">x</span><span style="--x:1;color:red">y</span><b style="top:0 !important">z</b>');
    const classes = [...html.matchAll(/class="([^"]+)"/g)].map((m) => m[1]);
    expect(classes[0]).toMatch(/^a fw-s-\w+$/);
    expect(classes[1]).toBe(classes[0]?.split(' ')[1]);
    expect(html).not.toContain('style=');
    expect(sheet.css.split('\n')).toEqual([`.${classes[1]}{--x:1 !important;color:red !important}`, `.${classes[2]}{top:0 !important}`]);
  });

  it('shares classes across fragments of one page', () => {
    const sheet = new InlineStyleSheet();
    const a = sheet.extract('<i style="color:blue">a</i>');
    const b = sheet.extract('<i style="color:blue">b</i>');
    expect(/class="([^"]+)"/.exec(a)?.[1]).toBe(/class="([^"]+)"/.exec(b)?.[1]);
    expect(sheet.css.split('\n')).toHaveLength(1);
  });

  it('leaves style-like text in code alone', () => {
    const sheet = new InlineStyleSheet();
    const html = '<pre><code>&lt;div style="color:red"&gt;</code></pre>';
    expect(sheet.extract(html)).toBe(html);
    expect(sheet.css).toBe('');
  });

  it('rewrites links through the given rewriter', () => {
    const sheet = new InlineStyleSheet();
    const rewrite = docsLinkRewriter(new Set(['a', 'b/c']), (p) => `/docs/${p}`);
    const html = sheet.extract('<a href="/a">1</a><a href="/b/c?x=1#y">2</a><a href="/z">3</a><a href="//cdn/a">4</a>', { href: rewrite });
    expect(html).toBe('<a href="/docs/a">1</a><a href="/docs/b/c?x=1#y">2</a><a href="/z">3</a><a href="//cdn/a">4</a>');
  });

  it('puts Astro’s base in front of site-root image sources', () => {
    const sheet = new InlineStyleSheet();
    const html = sheet.extract('<img src="/hero.svg" alt=""><img src="/sub/x.png" alt=""><img src="https://cdn/x.png" alt=""><a href="/hero.svg">h</a>', {
      src: assetRewriter('/sub'),
    });
    expect(html).toBe('<img src="/sub/hero.svg" alt=""><img src="/sub/x.png" alt=""><img src="https://cdn/x.png" alt=""><a href="/hero.svg">h</a>');
  });
});

describe('React resource hints', () => {
  it('drops the image preload links React writes into the body', () => {
    const sheet = new InlineStyleSheet();
    expect(sheet.extract('<link rel="preload" as="image" href="/hero.svg"><p>x</p>')).toBe('<p>x</p>');
  });
});

describe('assetRewriter', () => {
  it('prefixes site-root paths with the base, and only those', () => {
    expect(assetRewriter('')('/logo.svg')).toBeNull();
    expect(assetRewriter('/sub')('/logo.svg')).toBe('/sub/logo.svg');
    expect(assetRewriter('/sub')('/sub')).toBeNull();
    expect(assetRewriter('/sub')('//cdn/logo.svg')).toBeNull();
  });
});

describe('siteHrefRewriter', () => {
  const pages = new Set(['', 'quickstart', 'guides/setup']);

  it('sends docs pages through the linker and puts the base in front of every other site-root path', () => {
    const rewrite = siteHrefRewriter(pages, createLinker('/sub/docs', 'always'), { base: '/docs', siteBase: '/sub', trailingSlash: 'always' });
    expect(rewrite('/quickstart')).toBe('/sub/docs/quickstart/');
    expect(rewrite('/guides/setup#install')).toBe('/sub/docs/guides/setup/#install');
    expect(rewrite('/')).toBe('/sub/');
    expect(rewrite('/#top')).toBe('/sub/#top');
    expect(rewrite('/pricing')).toBe('/sub/pricing');
    expect(rewrite('/shots/a.png')).toBe('/sub/shots/a.png');
  });

  it('leaves absolute, relative, hash-only and already-based hrefs alone', () => {
    const rewrite = siteHrefRewriter(pages, createLinker('/sub/docs', 'always'), { base: '/docs', siteBase: '/sub', trailingSlash: 'always' });
    for (const href of ['https://example.com/', '//cdn.example.com/a', 'mailto:a@b.c', 'quickstart', '#install', '/sub', '/sub/', '/sub/pricing']) {
      expect(rewrite(href), href).toBeNull();
    }
  });

  it('finds docs pages written with the docs base already in front', () => {
    const rewrite = siteHrefRewriter(pages, createLinker('/sub/docs', 'always'), { base: '/docs', siteBase: '/sub', trailingSlash: 'always' });
    expect(rewrite('/docs/quickstart')).toBe('/sub/docs/quickstart/');
    expect(rewrite('/docs')).toBe('/sub/docs/');
    expect(rewrite('/docs/guides/setup?x=1')).toBe('/sub/docs/guides/setup/?x=1');
    // Not a page: Astro's base only.
    expect(rewrite('/docs/nope')).toBe('/sub/docs/nope');
  });

  it('writes the host home without a slash when Astro asks for none', () => {
    const rewrite = siteHrefRewriter(pages, createLinker('/sub/docs', 'never'), { base: '/docs', siteBase: '/sub', trailingSlash: 'never' });
    expect(rewrite('/')).toBe('/sub');
    expect(rewrite('/?x=1')).toBe('/sub?x=1');
    expect(rewrite('/quickstart')).toBe('/sub/docs/quickstart');
  });

  it('changes only docs links when the site has no base', () => {
    const rewrite = siteHrefRewriter(pages, createLinker('/docs', 'ignore'), { base: '/docs', siteBase: '', trailingSlash: 'ignore' });
    expect(rewrite('/quickstart')).toBe('/docs/quickstart');
    expect(rewrite('/')).toBeNull();
    expect(rewrite('/pricing')).toBeNull();
  });

  it('rewrites links in rendered content', () => {
    const sheet = new InlineStyleSheet();
    const html = sheet.extract('<a href="/">home</a><a href="/quickstart">q</a><a href="/pricing">p</a>', {
      href: siteHrefRewriter(pages, createLinker('/sub/docs', 'always'), { base: '/docs', siteBase: '/sub', trailingSlash: 'always' }),
    });
    expect(html).toBe('<a href="/sub/">home</a><a href="/sub/docs/quickstart/">q</a><a href="/sub/pricing">p</a>');
  });
});
