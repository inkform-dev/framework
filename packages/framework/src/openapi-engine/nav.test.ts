import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildNavTree } from './nav';
import { parseOpenApiDocument } from './parse';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');
// packages/framework/src/openapi-engine -> repo root, then into examples/.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const POKEAPI_SPEC = path.join(REPO_ROOT, 'examples', 'pokeapi-docs', 'content', 'docs', 'openapi.json');

describe('buildNavTree', () => {
  it('matches a snapshot for the real pokeapi-docs spec', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const { schema, valid } = await parseOpenApiDocument(raw, { format: 'json' });
    expect(valid).toBe(true);

    const tree = buildNavTree(schema);
    expect(tree).toMatchSnapshot();
  });

  it('handles orphan operations, webhooks, models, and empty declared tags (edge-case fixture)', async () => {
    const raw = readFileSync(path.join(FIXTURES_DIR, 'edge-cases.json'), 'utf-8');
    const { schema, valid } = await parseOpenApiDocument(raw, { format: 'json' });
    expect(valid).toBe(true);

    const tree = buildNavTree(schema);

    // Declared tag with zero operations doesn't produce a dead sidebar entry.
    expect(tree.tagGroups.find((g) => g.tag === 'empty-tag')).toBeUndefined();

    // Orphan (untagged) operation lands in the synthetic "default" group, not dropped.
    const defaultGroup = tree.tagGroups.find((g) => g.tag === 'default');
    expect(defaultGroup?.operations).toHaveLength(1);
    expect(defaultGroup?.operations[0].path).toBe('/status');

    const widgetsGroup = tree.tagGroups.find((g) => g.tag === 'widgets');
    expect(widgetsGroup?.description).toBe('Widget operations.');
    expect(widgetsGroup?.operations).toHaveLength(1);
    expect(widgetsGroup?.operations[0].operationId).toBe('listWidgets');

    expect(tree.webhooks).toEqual([
      {
        kind: 'webhook',
        name: 'widgetCreated',
        method: 'post',
        summary: 'Fired when a widget is created',
        deprecated: false,
      },
    ]);

    expect(tree.models).toHaveLength(1);
    expect(tree.models[0]).toEqual({
      kind: 'model',
      name: 'Widget',
      title: 'Widget',
      description: 'A single widget.',
    });
  });
});
