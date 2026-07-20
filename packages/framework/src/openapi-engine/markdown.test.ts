import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildNavTree } from './nav';
import { renderOpenApiMarkdown, renderOperationMarkdown } from './markdown';
import { parseOpenApiDocument } from './parse';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const POKEAPI_SPEC = path.join(REPO_ROOT, 'examples', 'pokeapi-docs', 'content', 'docs', 'openapi.json');

describe('markdown rendering (pokeapi-docs spec)', () => {
  it('renders non-empty markdown for every operation', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const { schema } = await parseOpenApiDocument(raw, { format: 'json' });
    const tree = buildNavTree(schema);

    const allOperations = tree.tagGroups.flatMap((g) => g.operations);
    expect(allOperations.length).toBeGreaterThan(0);

    for (const entry of allOperations) {
      const md = renderOperationMarkdown(schema, { path: entry.path, method: entry.method });
      expect(md.length).toBeGreaterThan(0);
      expect(md).toContain(entry.summary);
      expect(md).toContain(`${entry.method.toUpperCase()} ${entry.path}`);
    }
  });

  it('resolves an operation by operationId too', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const { schema } = await parseOpenApiDocument(raw, { format: 'json' });

    const md = renderOperationMarkdown(schema, { operationId: 'get-pokemon' });
    expect(md).toContain('Get a Pokémon');
    expect(md).toContain('GET /pokemon/{name}');
    // Parameters table: the `name` path param should show up with its description.
    expect(md).toContain('| name | path | yes |');
  });

  it('renders a non-empty whole-document markdown with every tag as a section', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const { schema } = await parseOpenApiDocument(raw, { format: 'json' });

    const md = renderOpenApiMarkdown(schema);
    expect(md.length).toBeGreaterThan(0);
    expect(md).toContain('# PokéAPI v2');
    for (const tag of ['Pokémon', 'Types', 'Moves', 'Abilities']) {
      expect(md).toContain(`# ${tag}`);
    }
    expect(md).toContain('List Pokémon');
    expect(md).toContain('Get an ability');
  });

  it('returns an empty string for an operation that does not exist', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const { schema } = await parseOpenApiDocument(raw, { format: 'json' });
    expect(renderOperationMarkdown(schema, { operationId: 'nonexistent' })).toBe('');
  });
});
