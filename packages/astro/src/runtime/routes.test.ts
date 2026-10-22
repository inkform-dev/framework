import { describe, expect, it } from 'vitest';
import type { DocsConfig } from '@inkform/framework/nav';
import { buildRoutes, createLinker, findRoute, routeIndex, RouteConflictError, slugParam } from './routes';

const config: DocsConfig = {
  name: 'Test',
  navigation: [],
  tabs: [
    {
      tab: 'Guides',
      navigation: [
        {
          group: 'Start',
          pages: [
            { title: 'Intro', slug: '', file: 'index.mdx' },
            { title: 'Setup', slug: 'setup', file: 'setup.mdx', children: [{ title: 'Deep', slug: 'setup/deep', file: 'setup/deep.mdx' }] },
            { title: 'GitHub', slug: 'gh', file: '', href: 'https://github.com' },
          ],
        },
        { group: 'Again', pages: [{ title: 'Intro', slug: '', file: 'index.mdx' }] },
      ],
    },
    { tab: 'API Reference', openapi: 'openapi.json' },
  ],
};

const inputs = {
  config,
  apiSlug: 'api-reference',
  operationIds: ['list-plants', 'create-plant'],
  blogSlugs: ['hello'],
  hasChangelog: true,
};

describe('buildRoutes', () => {
  it('lists every page under the base, in order', () => {
    const routes = buildRoutes(inputs);
    expect(routes.map((r) => [r.kind, r.path])).toEqual([
      ['doc', ''],
      ['doc', 'setup'],
      ['doc', 'setup/deep'],
      ['api-index', 'api-reference'],
      ['api-operation', 'api-reference/operations/list-plants'],
      ['api-operation', 'api-reference/operations/create-plant'],
      ['blog-index', 'blog'],
      ['blog-post', 'blog/hello'],
      ['changelog', 'changelog'],
    ]);
  });

  it('leaves out the API, blog and changelog when there are none', () => {
    const routes = buildRoutes({ ...inputs, apiSlug: null, blogSlugs: [], hasChangelog: false });
    expect(routes.every((r) => r.kind === 'doc')).toBe(true);
  });

  it('fails with both names when two sources claim one URL', () => {
    const clash: DocsConfig = { name: 'C', navigation: [{ group: 'G', pages: [{ title: 'Blog', slug: 'blog', file: 'blog.mdx' }] }] };
    expect(() => buildRoutes({ ...inputs, config: clash, apiSlug: null })).toThrow(RouteConflictError);
    expect(() => buildRoutes({ ...inputs, config: clash, apiSlug: null })).toThrow(/doc page blog\.mdx and the blog/);
  });
});

describe('route lookup', () => {
  const index = routeIndex(buildRoutes(inputs));

  it('maps the docs home to an undefined rest param and back', () => {
    expect(slugParam('')).toBeUndefined();
    expect(slugParam('setup/deep')).toBe('setup/deep');
    expect(findRoute(index, undefined)?.kind).toBe('doc');
  });

  it('finds operations and ignores stray slashes', () => {
    const route = findRoute(index, '/api-reference/operations/create-plant/');
    expect(route).toMatchObject({ kind: 'api-operation', operationId: 'create-plant' });
  });

  it('returns null for an unknown path', () => {
    expect(findRoute(index, 'nope')).toBeNull();
  });
});

describe('createLinker', () => {
  it('joins paths under the public base', () => {
    const link = createLinker('/docs', 'ignore');
    expect(link('')).toBe('/docs');
    expect(link('setup/deep')).toBe('/docs/setup/deep');
  });

  it('adds a trailing slash when Astro asks for one, before any hash', () => {
    const link = createLinker('/docs', 'always');
    expect(link('')).toBe('/docs/');
    expect(link('setup#install')).toBe('/docs/setup/#install');
  });

  it('works from the site root', () => {
    const link = createLinker('', 'never');
    expect(link('')).toBe('/');
    expect(link('setup')).toBe('/setup');
  });
});
