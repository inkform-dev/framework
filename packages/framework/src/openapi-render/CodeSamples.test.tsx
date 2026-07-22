import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { findOperation, parseOpenApi } from '../openapi';
import { CodeSamples } from './CodeSamples';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const POKEAPI_SPEC = path.join(REPO_ROOT, 'examples', 'pokeapi-docs', 'content', 'docs', 'openapi.json');

/** CodeSamples is an async Server Component (shiki highlighting) — renderToStaticMarkup can't render it; this can, and `stream.allReady` ensures highlighting has actually finished before reading. */
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

describe('CodeSamples (real pokeapi spec, real snippetz generation)', () => {
  it('generates real, correct code for a GET operation with a path param, across 4 languages', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const model = await parseOpenApi(raw, 'json');
    const op = findOperation(model, 'get-pokemon');
    expect(op).not.toBeNull();
    if (!op) return;

    const html = await renderAsync(<CodeSamples operation={op} servers={model.servers} />);

    // Real substituted path param (not a literal "{name}"), real host — each
    // as a real, syntax-highlighted <span> now (shiki breaks a line into
    // per-token spans), not one contiguous run, so check the meaningful
    // pieces rather than one exact string.
    expect(html).toContain('cURL');
    expect(html).toContain('pokeapi.co');
    expect(html).toContain('pikachu');
    expect(html).not.toContain('{name}');
    // Real shiki output, not a plain-text fallback.
    expect(html).toContain('class="shiki');

    // JavaScript fetch and Python requests both present with real syntax.
    expect(html).toContain('JavaScript');
    expect(html).toMatch(/fetch/);
    expect(html).toContain('Python');
    expect(html).toMatch(/requests/);
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

    const html = await renderAsync(<CodeSamples operation={op} servers={[{ url: 'https://api.example.com' }]} />);
    expect(html).toContain('Gizmo');
    expect(html).toMatch(/POST/);
  });
});
