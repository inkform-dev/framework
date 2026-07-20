import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findOperation, parseOpenApi } from './openapi';

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SRC_DIR, '../../..');
const POKEAPI_SPEC = path.join(REPO_ROOT, 'examples', 'pokeapi-docs', 'content', 'docs', 'openapi.json');
const MULTI_FILE_MAIN = path.join(SRC_DIR, 'openapi-engine', '__fixtures__', 'multi-file', 'main.yaml');

describe('parseOpenApi (public adapter over the openapi-engine)', () => {
  it('builds the same narrow OpenApiModel shape from the real pokeapi spec', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const model = await parseOpenApi(raw, 'json');

    expect(model.info).toEqual({
      title: 'PokéAPI v2',
      version: '2.0.0',
      description: expect.stringContaining('RESTful Pokémon API'),
    });
    expect(model.tags.map((t) => t.name)).toEqual(['Pokémon', 'Types', 'Moves', 'Abilities']);
    expect(model.operations).toHaveLength(5);

    const op = findOperation(model, 'get-pokemon');
    expect(op).not.toBeNull();
    expect(op?.method).toBe('get');
    expect(op?.path).toBe('/pokemon/{name}');
    expect(op?.parameters).toEqual([
      expect.objectContaining({ name: 'name', in: 'path', required: true }),
    ]);
    expect(op?.responses.map((r) => r.status)).toEqual(['200', '404']);
  });

  it('findOperation returns null for an operationId that does not exist', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const model = await parseOpenApi(raw, 'json');
    expect(findOperation(model, 'nonexistent')).toBeNull();
  });

  it('resolves an external file $ref end-to-end through the public OpenApiModel (the capability gained from the new engine)', async () => {
    const raw = readFileSync(MULTI_FILE_MAIN, 'utf-8');
    const model = await parseOpenApi(raw, 'yaml', { baseDir: path.dirname(MULTI_FILE_MAIN) });

    const op = findOperation(model, 'listWidgets');
    expect(op).not.toBeNull();
    const schema = op?.responses[0]?.schema;
    // items schema came from an external file (./widget.yaml) — proves the
    // $ref was bundled + dereferenced, not left dangling as `{ $ref: ... }`
    // the way the old hand-rolled resolver would have.
    const items = schema?.items as Record<string, unknown> | undefined;
    expect(items?.$ref).toBeUndefined();
    expect((items?.properties as Record<string, Record<string, unknown>>)?.id?.description).toBe(
      'Widget identifier, defined in an external file.',
    );
  });

  it('never throws on malformed input; degrades to an empty best-effort model', async () => {
    const model = await parseOpenApi('{ this is not valid json or yaml ::: [[[', 'json');
    expect(model.info.title).toBe('API Reference');
    expect(model.operations).toEqual([]);
    expect(model.tags).toEqual([]);
  });
});
