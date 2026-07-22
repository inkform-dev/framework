import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { findOperation, parseOpenApi } from '../openapi';
import { OperationPage } from './OperationPage';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const POKEAPI_SPEC = path.join(REPO_ROOT, 'examples', 'pokeapi-docs', 'content', 'docs', 'openapi.json');

/** OperationPage is an async Server Component (shiki highlighting) — renderToStaticMarkup can't render it; this can, and `stream.allReady` ensures highlighting has actually finished before reading. */
async function renderAsync(node: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(node);
  await stream.allReady;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let html = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
  }
  return html;
}

describe('OperationPage (real pokeapi spec, full composition)', () => {
  it('renders every real operation without crashing, with correct core content', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const model = await parseOpenApi(raw, 'json');
    expect(model.operations.length).toBeGreaterThan(0);

    for (const op of model.operations) {
      const html = await renderAsync(<OperationPage operation={op} servers={model.servers} />);
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain(op.summary);
      expect(html).toContain(`fw-method-${op.method}`);
      expect(html).toContain(op.path);
      // operationId is rendered as visible text (not just a prop) so Pagefind
      // actually indexes it, and pagefind-weight-boosts it and the path —
      // see the data-pagefind-weight comment in OperationPage.tsx.
      expect(html).toContain(op.operationId);
      expect(html).toContain('data-pagefind-weight="2"');
    }
  });

  it('get-pokemon: renders path param, nested response schema fields, and code samples together', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const model = await parseOpenApi(raw, 'json');
    const op = findOperation(model, 'get-pokemon');
    expect(op).not.toBeNull();
    if (!op) return;

    const html = await renderAsync(<OperationPage operation={op} servers={model.servers} />);

    // Path Parameters section — the "name" path param.
    expect(html).toContain('Path Parameters');
    expect(html).toContain('pikachu'); // path param's example value

    // Response schema (Pokemon, dereferenced) fields reach the page via SchemaObject.
    expect(html).toContain('base_experience');
    expect(html).toContain('sprites');

    // Code samples panel present, using the same substituted URL.
    expect(html).toContain('cURL');
    expect(html).toContain('pokeapi.co/api/v2/pokemon/pikachu');

    // Try It button present (TryItConsole) — real now, not a dead placeholder.
    expect(html).toContain('fw-apiref-tryit');
    expect(html).toContain('Try it');
    // Modal itself isn't in the initial (unopened) render.
    expect(html).not.toContain('fw-playground-overlay');
  });

  it('get-type: a schema with array-of-object nested fields (damage_relations.no_damage_to etc.) renders without crashing', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const model = await parseOpenApi(raw, 'json');
    const op = findOperation(model, 'get-type');
    expect(op).not.toBeNull();
    if (!op) return;

    const html = await renderAsync(<OperationPage operation={op} servers={model.servers} />);
    expect(html).toContain('damage_relations');
    expect(html).toContain('no_damage_to');
  });
});
