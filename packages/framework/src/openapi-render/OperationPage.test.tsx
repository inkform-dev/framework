import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { findOperation, parseOpenApi } from '../openapi';
import { OperationPage } from './OperationPage';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const POKEAPI_SPEC = path.join(REPO_ROOT, 'examples', 'pokeapi-docs', 'content', 'docs', 'openapi.json');

describe('OperationPage (real pokeapi spec, full composition)', () => {
  it('renders every real operation without crashing, with correct core content', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const model = await parseOpenApi(raw, 'json');
    expect(model.operations.length).toBeGreaterThan(0);

    for (const op of model.operations) {
      const html = renderToStaticMarkup(<OperationPage operation={op} servers={model.servers} />);
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain(op.summary);
      expect(html).toContain(`fw-method-${op.method}`);
      expect(html).toContain(op.path);
    }
  });

  it('get-pokemon: renders path param, nested response schema fields, and code samples together', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const model = await parseOpenApi(raw, 'json');
    const op = findOperation(model, 'get-pokemon');
    expect(op).not.toBeNull();
    if (!op) return;

    const html = renderToStaticMarkup(<OperationPage operation={op} servers={model.servers} />);

    // Path Parameters section — the "name" path param.
    expect(html).toContain('Path Parameters');
    expect(html).toContain('pikachu'); // path param's example value

    // Response schema (Pokemon, dereferenced) fields reach the page via SchemaObject.
    expect(html).toContain('base_experience');
    expect(html).toContain('sprites');

    // Code samples panel present, using the same substituted URL.
    expect(html).toContain('cURL');
    expect(html).toContain('pokeapi.co/api/v2/pokemon/pikachu');

    // No dead "Try it" button — deferred to a later phase, shouldn't render a non-functional one.
    expect(html).not.toContain('fw-apiref-tryit');
  });

  it('get-type: a schema with array-of-object nested fields (damage_relations.no_damage_to etc.) renders without crashing', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const model = await parseOpenApi(raw, 'json');
    const op = findOperation(model, 'get-type');
    expect(op).not.toBeNull();
    if (!op) return;

    const html = renderToStaticMarkup(<OperationPage operation={op} servers={model.servers} />);
    expect(html).toContain('damage_relations');
    expect(html).toContain('no_damage_to');
  });
});
