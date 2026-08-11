import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildMarkdownPage, createMarkdownHandler, processMarkdown } from './markdown';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const POKEAPI_CONTENT_ROOT = path.join(REPO_ROOT, 'examples', 'pokeapi-docs', 'content');

describe('processMarkdown', () => {
  it('strips imports/exports but keeps the body', () => {
    const md = processMarkdown(
      `import { Playground } from '@/widgets';
import { SomeComponent } from './other.mdx';

# Hello

Some text.
`,
    );
    expect(md).not.toMatch(/import/);
    expect(md).toContain('# Hello');
    expect(md).toContain('Some text.');
  });

  it('keeps self-closing data components as JSX markers (props are data)', () => {
    const md = processMarkdown(
      `# Title

<Playground template="react" />

<ApiLink operationId="get-pokemon">Get a Pokémon</ApiLink>
`,
    );
    expect(md).toContain('<Playground template="react" />');
    // ApiLink HAS children, so it's treated as a wrapper — its text survives.
    expect(md).toContain('Get a Pokémon');
    expect(md).not.toContain('<ApiLink');
  });

  it('collapses layout wrappers to their inner content', () => {
    const md = processMarkdown(
      `<Tabs items={['a', 'b']}>

<Tab title="a">Alpha content</Tab>

<Tab title="b">Beta content</Tab>

</Tabs>
`,
    );
    expect(md).toContain('Alpha content');
    expect(md).toContain('Beta content');
    expect(md).not.toContain('<Tabs');
    expect(md).not.toContain('<Tab');
  });

  it('turns :::callout directives into blockquotes', () => {
    const md = processMarkdown(`:::info

Callout body here.

:::
`);
    expect(md).toMatch(/^> /);
    expect(md).toContain('Callout body here.');
  });

  it('keeps fenced code and GFM tables', () => {
    const md = processMarkdown(
      '```ts\nconst x = 1;\n```\n\n| a | b |\n| - | - |\n| 1 | 2 |\n',
    );
    expect(md).toContain('```ts');
    expect(md).toContain('const x = 1;');
    expect(md).toContain('| a | b |');
  });
});

describe('buildMarkdownPage (real pokeapi-docs content)', () => {
  beforeEach(() => {
    process.env.DOCS_CONTENT_ROOT = POKEAPI_CONTENT_ROOT;
  });
  afterEach(() => {
    delete process.env.DOCS_CONTENT_ROOT;
  });

  it('returns a doc page with a title header', async () => {
    const md = await buildMarkdownPage('quickstart');
    expect(md).toMatch(/^# Quickstart/);
    expect(md).toContain('PokéAPI requires zero configuration.');
  });

  it('returns the index page for an empty slug', async () => {
    const md = await buildMarkdownPage('');
    expect(md).toMatch(/^# /);
  });

  it('returns an API operation under <apiBase>/operations/<operationId>', async () => {
    const md = await buildMarkdownPage('api-reference/operations/get-pokemon', {
      apiBasePath: 'api-reference',
    });
    expect(md).toContain('GET /pokemon/{name}');
  });

  it('returns a blog post under blog/<slug>', async () => {
    const md = await buildMarkdownPage('blog/building-a-pokedex-with-nextjs');
    expect(md).toMatch(/^# /);
  });

  it('returns a changelog entry under changelog/<slug>', async () => {
    const md = await buildMarkdownPage('changelog/v1-0');
    expect(md).toMatch(/^# /);
    expect(md).toContain('First public version of these docs');
  });

  it('returns null for unknown slugs', async () => {
    expect(await buildMarkdownPage('definitely-not-a-page')).toBeNull();
    expect(await buildMarkdownPage('api-reference/operations/nope', { apiBasePath: 'api-reference' })).toBeNull();
    expect(await buildMarkdownPage('blog/nope')).toBeNull();
  });
});

describe('createMarkdownHandler', () => {
  beforeEach(() => {
    process.env.DOCS_CONTENT_ROOT = POKEAPI_CONTENT_ROOT;
  });
  afterEach(() => {
    delete process.env.DOCS_CONTENT_ROOT;
  });

  const handler = createMarkdownHandler({ apiBasePath: 'api-reference' });
  // Mimics Next.js passing the resolved [[...slug]] params, the same way it
  // routes the docs pages themselves.
  const ctx = (slug?: string[]) => ({ params: Promise.resolve({ slug }) });

  it('serves a doc page as text/markdown', async () => {
    const res = await handler(new Request('http://localhost/quickstart.md'), ctx(['quickstart']));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/markdown');
    expect(await res.text()).toContain('# Quickstart');
  });

  it('serves the index page for an empty slug', async () => {
    const res = await handler(new Request('http://localhost/index.md'), ctx([]));
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/^# /);
  });

  it('maps /index to the index page (Next aliases /index → /)', async () => {
    const res = await handler(new Request('http://localhost/index.md'), ctx(['index']));
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/^# /);
  });

  it('serves an operation under <apiBase>/operations/<operationId>', async () => {
    const res = await handler(
      new Request('http://localhost/api-reference/operations/get-pokemon.md'),
      ctx(['api-reference', 'operations', 'get-pokemon']),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('GET /pokemon/{name}');
  });

  it('404s unknown slugs', async () => {
    const res = await handler(new Request('http://localhost/definitely-not-a-page.md'), ctx(['definitely-not-a-page']));
    expect(res.status).toBe(404);
  });
});
