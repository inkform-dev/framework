import { describe, expect, it } from 'vitest';
import type { DocsConfig } from './nav';
import { apiTab, apiTabSlug, docRouteSlugs, joinHref } from './routes';

const tabbed: DocsConfig = {
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
            {
              title: 'Setup',
              slug: 'setup',
              file: 'setup.mdx',
              children: [{ title: 'Deep', slug: 'setup/deep', file: 'setup/deep.mdx' }],
            },
            { title: 'GitHub', slug: 'github', file: '', href: 'https://github.com' },
          ],
        },
        { group: 'Again', pages: [{ title: 'Intro again', slug: '', file: 'index.mdx' }] },
      ],
    },
    { tab: 'API Reference', openapi: 'openapi.json' },
  ],
};

describe('apiTab / apiTabSlug', () => {
  it('finds the tab with an OpenAPI spec and slugs its label', () => {
    expect(apiTab(tabbed)?.tab).toBe('API Reference');
    expect(apiTabSlug(tabbed)).toBe('api-reference');
  });

  it('reads a single-tab config with a top-level openapi', () => {
    const single: DocsConfig = { name: 'S', navigation: [], openapi: 'spec.yaml' };
    expect(apiTabSlug(single)).toBe('documentation');
  });

  it('returns null without an API tab', () => {
    const docsOnly: DocsConfig = { name: 'D', navigation: [{ group: 'G', pages: [] }] };
    expect(apiTab(docsOnly)).toBeNull();
    expect(apiTabSlug(docsOnly)).toBeNull();
  });
});

describe('docRouteSlugs', () => {
  it('lists page slugs in nav order, children included, links and duplicates dropped', () => {
    expect(docRouteSlugs(tabbed)).toEqual(['', 'setup', 'setup/deep']);
  });
});

describe('joinHref', () => {
  it('joins a base and a slug', () => {
    expect(joinHref('/docs', 'a/b')).toBe('/docs/a/b');
    expect(joinHref('/docs/', '/a/')).toBe('/docs/a');
  });

  it('maps the index to the base itself, or / without a base', () => {
    expect(joinHref('/docs', '')).toBe('/docs');
    expect(joinHref('', '')).toBe('/');
    expect(joinHref('', 'quickstart')).toBe('/quickstart');
  });
});
