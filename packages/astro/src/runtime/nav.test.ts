import { describe, expect, it } from 'vitest';
import type { DocsConfig } from '@inkform/framework/nav';
import type { OpenApiNavTree } from '@inkform/framework/openapi-engine/nav';
import { siteHrefRewriter } from './inline-styles';
import { apiSidebar, docBreadcrumbs, docPagination, docsSidebar, topNav } from './nav';
import { createLinker } from './routes';

const link = createLinker('/docs', 'ignore');

const config: DocsConfig = {
  name: 'Test',
  navigation: [],
  anchors: [{ name: 'GitHub', href: 'https://github.com/x' }],
  navbarLinks: [
    { name: 'GitHub again', href: 'https://github.com/x' },
    { name: 'Status', href: '/status' },
  ],
  tabs: [
    {
      tab: 'Guides',
      navigation: [
        {
          group: 'Start',
          pages: [
            { title: 'Intro', slug: '', file: 'index.mdx' },
            { title: 'Setup', slug: 'setup', file: 'setup.mdx', children: [{ title: 'Deep', slug: 'setup/deep', file: 'setup/deep.mdx' }] },
            { title: 'Changelog site', slug: 'x', file: '', href: 'https://example.com/changes' },
          ],
        },
      ],
    },
    { tab: 'Recipes', navigation: [{ group: 'Cook', pages: [{ title: 'Bake', slug: 'recipes/bake', file: 'recipes/bake.mdx' }] }] },
    { tab: 'API Reference', openapi: 'openapi.json' },
  ],
};

describe('docsSidebar', () => {
  it('lists a tab’s groups with nested pages one level deeper', () => {
    const [group] = docsSidebar(config, 'Guides', 'setup/deep', link);
    expect(group?.group).toBe('Start');
    expect(group?.items.map((i) => [i.title, i.href, i.depth, i.active, i.external])).toEqual([
      ['Intro', '/docs', 0, false, false],
      ['Setup', '/docs/setup', 0, false, false],
      ['Deep', '/docs/setup/deep', 1, true, false],
      ['Changelog site', 'https://example.com/changes', 0, false, true],
    ]);
  });

  it('shows only the active tab’s groups', () => {
    expect(docsSidebar(config, 'Recipes', null, link).map((g) => g.group)).toEqual(['Cook']);
  });
});

describe('apiSidebar', () => {
  it('groups operations by tag with their methods', () => {
    const tree: OpenApiNavTree = {
      tagGroups: [
        {
          kind: 'tag-group',
          tag: 'Plants',
          operations: [
            { kind: 'operation', operationId: 'list', method: 'get', path: '/plants', summary: 'List', deprecated: false },
            { kind: 'operation', operationId: 'make', method: 'post', path: '/plants', summary: '', deprecated: false },
          ],
        },
      ],
      webhooks: [],
      models: [],
    };
    const [group] = apiSidebar(tree, 'api-reference', 'make', link);
    expect(group?.items).toEqual([
      { title: 'List', href: '/docs/api-reference/operations/list', active: false, depth: 0, external: false, method: 'get' },
      { title: 'make', href: '/docs/api-reference/operations/make', active: true, depth: 0, external: false, method: 'post' },
    ]);
  });
});

describe('topNav', () => {
  it('links tabs to their first page, dedupes anchors and navbar links, adds blog and changelog', () => {
    const links = topNav(config, { apiSlug: 'api-reference', hasBlog: true, hasChangelog: true, active: { kind: 'docs', tab: 'Recipes' }, link });
    expect(links.map((l) => [l.label, l.href, l.active, l.external])).toEqual([
      ['Guides', '/docs', false, false],
      ['Recipes', '/docs/recipes/bake', true, false],
      ['API Reference', '/docs/api-reference', false, false],
      ['GitHub', 'https://github.com/x', false, true],
      ['Status', '/status', false, false],
      ['Blog', '/docs/blog', false, false],
      ['Changelog', '/docs/changelog', false, false],
    ]);
  });

  it('marks the API tab on API pages and drops it without an API', () => {
    expect(topNav(config, { apiSlug: 'api-reference', hasBlog: false, hasChangelog: false, active: { kind: 'api' }, link }).find((l) => l.active)?.label).toBe(
      'API Reference',
    );
    expect(topNav(config, { apiSlug: null, hasBlog: false, hasChangelog: false, active: { kind: 'api' }, link }).map((l) => l.label)).not.toContain(
      'API Reference',
    );
  });
});

describe('under an Astro base with trailing slashes', () => {
  // Astro `base: '/sub'`, `trailingSlash: 'always'`: the docs are at /sub/docs/.
  const subLink = createLinker('/sub/docs', 'always');
  const rewrite = siteHrefRewriter(new Set(['', 'setup', 'setup/deep', 'recipes/bake']), subLink, { base: '/docs', siteBase: '/sub', trailingSlash: 'always' });
  const resolve = (href: string) => rewrite(href) ?? href;
  const based: DocsConfig = {
    ...config,
    navbarLinks: [
      { name: 'Home', href: '/' },
      { name: 'Setup', href: '/setup' },
      { name: 'Status', href: '/status' },
      { name: 'Already based', href: '/sub/pricing' },
    ],
  };

  it('puts every navbar link under the base: docs pages through the linker, host pages after the base', () => {
    const links = topNav(based, { apiSlug: 'api-reference', hasBlog: true, hasChangelog: true, active: { kind: 'api' }, link: subLink, resolve });
    expect(links.map((l) => [l.label, l.href])).toEqual([
      ['Guides', '/sub/docs/'],
      ['Recipes', '/sub/docs/recipes/bake/'],
      ['API Reference', '/sub/docs/api-reference/'],
      ['GitHub', 'https://github.com/x'],
      ['Home', '/sub/'],
      ['Setup', '/sub/docs/setup/'],
      ['Status', '/sub/status'],
      ['Already based', '/sub/pricing'],
      ['Blog', '/sub/docs/blog/'],
      ['Changelog', '/sub/docs/changelog/'],
    ]);
  });

  it('resolves sidebar links that carry their own href', () => {
    const withLink: DocsConfig = {
      ...config,
      tabs: [{ tab: 'Guides', navigation: [{ group: 'Start', pages: [{ title: 'Pricing', slug: 'p', file: '', href: '/pricing' }] }] }],
    };
    const [group] = docsSidebar(withLink, 'Guides', null, subLink, resolve);
    expect(group?.items.map((i) => [i.title, i.href, i.external])).toEqual([['Pricing', '/sub/pricing', false]]);
    const [plain] = docsSidebar(config, 'Guides', null, subLink, resolve);
    expect(plain?.items.map((i) => i.href)).toEqual(['/sub/docs/', '/sub/docs/setup/', '/sub/docs/setup/deep/', 'https://example.com/changes']);
  });

  it('writes breadcrumbs and prev/next with the base and the slash', () => {
    const deep = { title: 'Deep', slug: 'setup/deep', file: 'setup/deep.mdx', depth: 2, group: 'Start', tab: 'Guides' };
    expect(docBreadcrumbs(config, deep, subLink)[1]).toEqual({ label: 'Setup', href: '/sub/docs/setup/' });
    expect(docPagination(config, 'setup', subLink)).toEqual({
      prev: { title: 'Intro', href: '/sub/docs/' },
      next: { title: 'Deep', href: '/sub/docs/setup/deep/' },
    });
  });
});

describe('docBreadcrumbs and docPagination', () => {
  const deep = { title: 'Deep', slug: 'setup/deep', file: 'setup/deep.mdx', depth: 2, group: 'Start', tab: 'Guides' };

  it('walks group › parents › page', () => {
    expect(docBreadcrumbs(config, deep, link)).toEqual([{ label: 'Start' }, { label: 'Setup', href: '/docs/setup' }, { label: 'Deep' }]);
  });

  it('links the neighbours within the tab', () => {
    expect(docPagination(config, 'setup', link)).toEqual({
      prev: { title: 'Intro', href: '/docs' },
      next: { title: 'Deep', href: '/docs/setup/deep' },
    });
    expect(docPagination(config, 'recipes/bake', link)).toEqual({ prev: null, next: null });
  });
});
