import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { JsonSchema } from '../openapi';
import { SchemaFields, SchemaNode } from './SchemaObject';

function render(schema: JsonSchema): string {
  return renderToStaticMarkup(<SchemaFields schema={schema} depth={0} />);
}

describe('SchemaObject', () => {
  it('renders nested object properties, expandable', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The identifier.' },
        owner: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
      },
      required: ['id'],
    };

    const html = render(schema);
    expect(html).toContain('id');
    expect(html).toContain('The identifier.');
    expect(html).toContain('required');
    expect(html).toContain('owner');
    // Nested object property is expandable (a <details>), not flattened inline.
    expect(html).toMatch(/<details[^>]*class="fw-param-row fw-param-row--expandable"/);
    expect(html).toContain('name');
  });

  it('renders oneOf as separate expandable variants, each with its own type label', () => {
    const schema: JsonSchema = {
      oneOf: [
        { title: 'Dog', type: 'object', properties: { breed: { type: 'string' } } },
        { title: 'Cat', type: 'object', properties: { indoor: { type: 'boolean' } } },
      ],
    };

    const html = render(schema);
    expect(html).toContain('Dog');
    expect(html).toContain('Cat');
    expect(html).toContain('breed');
    expect(html).toContain('indoor');
    expect((html.match(/fw-schema-variant"/g) ?? []).length).toBe(2);
  });

  it('falls back to "Option N" labels when oneOf variants have no title', () => {
    const schema: JsonSchema = {
      oneOf: [{ type: 'string' }, { type: 'integer' }],
    };
    const html = render(schema);
    expect(html).toContain('Option 1');
    expect(html).toContain('Option 2');
  });

  it('merges allOf members into one flat property list', () => {
    const schema: JsonSchema = {
      allOf: [
        { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        { type: 'object', properties: { name: { type: 'string' } } },
      ],
    };

    const html = render(schema);
    expect(html).toContain('id');
    expect(html).toContain('name');
    // Only one merged .fw-param-list, not two separate variant blocks.
    expect((html.match(/fw-param-list/g) ?? []).length).toBe(1);
    expect(html).not.toContain('fw-schema-variant"');
  });

  it('unwraps arrays to the item schema\'s own fields, without double-nesting', () => {
    const schema: JsonSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: { sku: { type: 'string' } },
      },
    };

    const html = render(schema);
    expect(html).toContain('sku');
  });

  it('terminates gracefully on a schema deeper than the depth guard, instead of infinite-recursing', () => {
    // Build a schema 20 levels deep — well past MAX_SCHEMA_DEPTH (8) — simulating
    // what a self-referential schema looks like once fully dereferenced (the
    // engine inlines $refs, so Comment.replies: Comment[] becomes literally
    // recursive data, not just a recursive type).
    let schema: JsonSchema = { type: 'string' };
    for (let i = 0; i < 20; i++) {
      schema = { type: 'object', properties: { child: schema } };
    }

    const start = Date.now();
    const html = render(schema);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(2000);
    expect(html).toContain('Nested too deep to expand further.');
  });

  it('SchemaNode renders a leaf property as a plain (non-expandable) row', () => {
    const html = renderToStaticMarkup(
      <SchemaNode schema={{ type: 'string', description: 'A name.' }} name="name" required={true} depth={0} />,
    );
    expect(html).toContain('name');
    expect(html).toContain('A name.');
    expect(html).toContain('required');
    expect(html).not.toMatch(/<details/);
  });

  it('shows a deprecated badge on deprecated schema properties', () => {
    const html = renderToStaticMarkup(
      <SchemaNode schema={{ type: 'string', deprecated: true }} name="legacyField" depth={0} />,
    );
    expect(html).toContain('deprecated');
  });
});
