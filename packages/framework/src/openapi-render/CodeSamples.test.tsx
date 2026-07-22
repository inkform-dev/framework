import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { findOperation, parseOpenApi } from '../openapi';
import { CodeSamples } from './CodeSamples';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const POKEAPI_SPEC = path.join(REPO_ROOT, 'examples', 'pokeapi-docs', 'content', 'docs', 'openapi.json');

describe('CodeSamples (real pokeapi spec, real snippetz generation)', () => {
  it('generates real, correct code for a GET operation with a path param, across 4 languages', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const model = await parseOpenApi(raw, 'json');
    const op = findOperation(model, 'get-pokemon');
    expect(op).not.toBeNull();
    if (!op) return;

    const html = renderToStaticMarkup(<CodeSamples operation={op} servers={model.servers} />);

    // cURL: real substituted path param (not a literal "{name}"), real host.
    // No explicit -X GET — curl defaults to GET, and snippetz correctly omits it.
    expect(html).toContain('cURL');
    expect(html).toContain('curl https://pokeapi.co/api/v2/pokemon/pikachu');
    expect(html).not.toContain('{name}');

    // JavaScript fetch and Python requests both present with real syntax.
    expect(html).toContain('JavaScript');
    expect(html).toMatch(/fetch\(/);
    expect(html).toContain('Python');
    expect(html).toMatch(/requests\.get/);
    expect(html).toContain('Node.js');
  });

  it('includes a real JSON request body sample for a write operation with a requestBody', async () => {
    // pokeapi-docs' real spec is read-only (GET-only), so build a small
    // synthetic write operation directly rather than skipping body coverage.
    const op = {
      method: 'post' as const,
      path: '/widgets',
      operationId: 'createWidget',
      summary: 'Create a widget',
      tag: 'widgets',
      parameters: [],
      requestBody: {
        required: true,
        contentType: 'application/json',
        schema: { type: 'object', properties: { name: { type: 'string', example: 'Gizmo' } } },
      },
      responses: [],
      security: [],
    };

    const html = renderToStaticMarkup(<CodeSamples operation={op} servers={[{ url: 'https://api.example.com' }]} />);
    expect(html).toContain('Gizmo');
    expect(html).toMatch(/-X POST|--request POST/);
  });
});
