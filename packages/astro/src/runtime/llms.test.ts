import { describe, expect, it } from 'vitest';
import { llmsIndex, type LlmsIndexInput } from './llms';
import { createLinker } from './routes';

const input: LlmsIndexInput = {
  name: 'Plants',
  docs: [
    { title: 'Intro', path: '', description: 'Start here.' },
    { title: 'Setup', path: 'guides/setup', description: null },
  ],
  operations: [{ title: 'Get a plant', path: 'api-reference/operations/get-plantsid', method: 'get', apiPath: '/plants/{id}' }],
  changelog: 'changelog',
  blog: [{ title: 'Hello', path: 'blog/hello', description: 'First post.' }],
};

describe('llmsIndex', () => {
  it('writes the framework’s llms.txt format', () => {
    expect(llmsIndex(input, createLinker('/docs', 'ignore'))).toBe(
      [
        '# Plants',
        '',
        '> Documentation for Plants.',
        '',
        '## Docs',
        '',
        '- [Intro](/docs): Start here.',
        '- [Setup](/docs/guides/setup)',
        '',
        '## API Reference',
        '',
        '- [Get a plant](/docs/api-reference/operations/get-plantsid): GET /plants/{id}',
        '',
        '## Changelog',
        '',
        '- [Changelog](/docs/changelog)',
        '',
        '## Blog',
        '',
        '- [Hello](/docs/blog/hello): First post.',
        '',
      ].join('\n'),
    );
  });

  it('links with Astro’s base and trailing slash, like the pages', () => {
    const text = llmsIndex(input, createLinker('/sub/docs', 'always'));
    expect(text).toContain('- [Intro](/sub/docs/): Start here.');
    expect(text).toContain('- [Setup](/sub/docs/guides/setup/)');
    expect(text).toContain('(/sub/docs/api-reference/operations/get-plantsid/): GET /plants/{id}');
    expect(text).toContain('- [Changelog](/sub/docs/changelog/)');
    expect(text).toContain('- [Hello](/sub/docs/blog/hello/): First post.');
  });

  it('leaves out empty sections', () => {
    const text = llmsIndex({ name: 'Bare', docs: [{ title: 'Intro', path: '' }], operations: [], changelog: null, blog: [] }, createLinker('', 'never'));
    expect(text).toBe('# Bare\n\n> Documentation for Bare.\n\n## Docs\n\n- [Intro](/)\n');
  });
});
