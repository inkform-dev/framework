import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseOpenApiDocument } from './parse';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');

describe('parseOpenApiDocument', () => {
  it('bundles an external file $ref and fully dereferences it', async () => {
    const mainPath = path.join(FIXTURES_DIR, 'multi-file', 'main.yaml');
    const raw = readFileSync(mainPath, 'utf-8');

    const result = await parseOpenApiDocument(raw, {
      format: 'yaml',
      baseDir: path.dirname(mainPath),
    });

    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);

    const paths = result.schema.paths as Record<string, unknown>;
    const get = (paths['/widgets'] as Record<string, unknown>).get as Record<string, unknown>;
    const responses = get.responses as Record<string, unknown>;
    const ok = responses['200'] as Record<string, unknown>;
    const content = ok.content as Record<string, unknown>;
    const mediaType = content['application/json'] as Record<string, unknown>;
    const schema = mediaType.schema as Record<string, unknown>;
    const items = schema.items as Record<string, unknown>;

    // Proves the external ref was actually resolved, not left as a
    // dangling `{ $ref: './widget.yaml#/Widget' }` (which is what our old
    // local-refs-only resolver in ../openapi.ts would have done).
    expect(items.$ref).toBeUndefined();
    expect(items.type).toBe('object');
    const properties = items.properties as Record<string, Record<string, unknown>>;
    expect(properties.id.description).toBe('Widget identifier, defined in an external file.');
    expect(properties.name.type).toBe('string');
  });

  it('never throws on malformed input, and reports invalid', async () => {
    const result = await parseOpenApiDocument('{ not: valid, "json or": yaml::: ][', {});
    expect(result.valid).toBe(false);
    expect(result.schema).toEqual({});
  });

  it('parses and validates a well-formed single-file spec with no external refs', async () => {
    const raw = JSON.stringify({
      openapi: '3.1.0',
      info: { title: 'Simple API', version: '1.0.0' },
      paths: {
        '/ping': {
          get: {
            operationId: 'ping',
            summary: 'Ping',
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    });

    const result = await parseOpenApiDocument(raw, { format: 'json' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect((result.schema.info as Record<string, unknown>).title).toBe('Simple API');
  });
});
