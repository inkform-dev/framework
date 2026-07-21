import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDoc, getOperation, listOperations, search } from './tools';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const POKEAPI_CONTENT_ROOT = path.join(REPO_ROOT, 'examples', 'pokeapi-docs', 'content');

describe('mcp tools (real pokeapi-docs content, via DOCS_CONTENT_ROOT)', () => {
  beforeEach(() => {
    process.env.DOCS_CONTENT_ROOT = POKEAPI_CONTENT_ROOT;
  });
  afterEach(() => {
    delete process.env.DOCS_CONTENT_ROOT;
  });

  it('listOperations returns all 5 real pokeapi operations', async () => {
    const ops = await listOperations();
    expect(ops).toHaveLength(5);
    expect(ops.map((o) => o.operationId)).toContain('get-pokemon');
    const getPokemon = ops.find((o) => o.operationId === 'get-pokemon');
    expect(getPokemon).toMatchObject({ method: 'get', path: '/pokemon/{name}', tag: 'Pokémon' });
  });

  it('getOperation renders real markdown for a real operationId', async () => {
    const markdown = await getOperation('get-pokemon');
    expect(markdown).not.toBeNull();
    expect(markdown).toContain('Get a Pokémon');
    expect(markdown).toContain('GET /pokemon/{name}');
  });

  it('getOperation returns null for an operationId that does not exist', async () => {
    expect(await getOperation('does-not-exist')).toBeNull();
  });

  it('getDoc returns real MDX content for a real slug', async () => {
    const content = await getDoc('quickstart');
    expect(content).not.toBeNull();
    expect(content!.length).toBeGreaterThan(0);
  });

  it('getDoc returns null for a slug that does not exist', async () => {
    expect(await getDoc('does-not-exist')).toBeNull();
  });

  it('search spans both docs and API operations in one ranked list — the actual motivating goal', async () => {
    // Recreates the same live-browser search this project already verified
    // manually earlier ("National Pokedex number" -> the get-pokemon
    // operation page) as an automated, real-content test.
    const results = await search('National Pokedex number');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.type === 'operation' && r.id === 'get-pokemon')).toBe(true);
  });

  it('search results include a real excerpt around the matched text, not just a truncated start', async () => {
    const results = await search('evolution chain');
    expect(results.length).toBeGreaterThan(0);
    const hasRelevantExcerpt = results.some((r) => /evolution/i.test(r.excerpt));
    expect(hasRelevantExcerpt).toBe(true);
  });

  it('an empty/no-config content root returns empty results everywhere, not an error', async () => {
    process.env.DOCS_CONTENT_ROOT = path.join(REPO_ROOT, 'this-directory-does-not-exist');
    expect(await listOperations()).toEqual([]);
    expect(await getOperation('anything')).toBeNull();
    expect(await getDoc('anything')).toBeNull();
    expect(await search('anything')).toEqual([]);
  });
});
