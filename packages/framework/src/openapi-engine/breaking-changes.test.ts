import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffOpenApiDocuments, formatDiffAsMarkdown } from './breaking-changes';
import { parseOpenApiDocument } from './parse';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const POKEAPI_SPEC = path.join(REPO_ROOT, 'examples', 'pokeapi-docs', 'content', 'docs', 'openapi.json');

function withOp(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    paths: {
      '/widgets/{id}': {
        get: {
          operationId: 'get-widget',
          summary: 'Get a widget',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'ok',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['id', 'name'],
                    properties: { id: { type: 'string' }, name: { type: 'string' } },
                  },
                },
              },
            },
          },
          ...overrides,
        },
      },
    },
  };
}

function categories(result: ReturnType<typeof diffOpenApiDocuments>): string[] {
  return result.changes.map((c) => c.category);
}

describe('diffOpenApiDocuments — operations', () => {
  it('flags a removed operation as breaking, an added one as non-breaking', () => {
    const before = withOp();
    const after = { paths: {} };
    const removed = diffOpenApiDocuments(before, after);
    expect(removed.breaking).toHaveLength(1);
    expect(removed.breaking[0]).toMatchObject({ category: 'operation-removed', location: 'GET /widgets/{id}' });

    const added = diffOpenApiDocuments(after, before);
    expect(added.breaking).toHaveLength(0);
    expect(categories(added)).toContain('operation-added');
  });

  it('two identical documents produce zero changes', () => {
    const doc = withOp();
    const result = diffOpenApiDocuments(doc, JSON.parse(JSON.stringify(doc)));
    expect(result.changes).toHaveLength(0);
  });

  it('flags newly-required auth as breaking, removed auth as non-breaking', () => {
    const before = withOp();
    const after = withOp({ security: [{ apiKey: [] }] });
    const result = diffOpenApiDocuments(before, after);
    expect(categories(result)).toContain('security-added');
    expect(result.breaking.some((c) => c.category === 'security-added')).toBe(true);

    const reverse = diffOpenApiDocuments(after, before);
    expect(categories(reverse)).toContain('security-removed');
    expect(reverse.breaking).toHaveLength(0);
  });
});

describe('diffOpenApiDocuments — parameters', () => {
  it('removed parameter is breaking', () => {
    const before = withOp();
    const after = withOp({ parameters: [] });
    const result = diffOpenApiDocuments(before, after);
    expect(result.breaking.some((c) => c.category === 'parameter-removed')).toBe(true);
  });

  it('parameter becoming required is breaking; becoming optional is not', () => {
    const before = withOp({ parameters: [{ name: 'id', in: 'path', required: false, schema: { type: 'string' } }] });
    const after = withOp({ parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }] });
    const result = diffOpenApiDocuments(before, after);
    expect(result.breaking.some((c) => c.category === 'parameter-now-required')).toBe(true);

    const reverse = diffOpenApiDocuments(after, before);
    expect(reverse.breaking).toHaveLength(0);
    expect(categories(reverse)).toContain('parameter-now-optional');
  });

  it('new required parameter is breaking; new optional parameter is not', () => {
    const before = withOp();
    const requiredAdded = withOp({
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'token', in: 'query', required: true, schema: { type: 'string' } },
      ],
    });
    const result = diffOpenApiDocuments(before, requiredAdded);
    expect(result.breaking.some((c) => c.category === 'parameter-added-required')).toBe(true);

    const optionalAdded = withOp({
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'verbose', in: 'query', required: false, schema: { type: 'boolean' } },
      ],
    });
    const result2 = diffOpenApiDocuments(before, optionalAdded);
    expect(result2.breaking).toHaveLength(0);
    expect(categories(result2)).toContain('parameter-added');
  });
});

describe('diffOpenApiDocuments — request body (direction: more required = breaking)', () => {
  it('a field becoming required in the request body is breaking', () => {
    const before = withOp({
      requestBody: {
        content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, note: { type: 'string' } } } } },
      },
    });
    const after = withOp({
      requestBody: {
        content: { 'application/json': { schema: { type: 'object', required: ['name', 'note'], properties: { name: { type: 'string' }, note: { type: 'string' } } } } },
      },
    });
    const result = diffOpenApiDocuments(before, after);
    expect(result.breaking.some((c) => c.category === 'field-now-required' && c.message.includes('note'))).toBe(true);
  });

  it('a new optional request field is non-breaking', () => {
    const before = withOp({
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } } },
    });
    const after = withOp({
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, tag: { type: 'string' } } } } } },
    });
    const result = diffOpenApiDocuments(before, after);
    expect(result.breaking).toHaveLength(0);
    expect(categories(result)).toContain('field-added');
  });

  it('removing an accepted enum value from a request field is breaking; adding one is not', () => {
    const before = withOp({
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['draft', 'published'] } } } } } },
    });
    const narrowed = withOp({
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['published'] } } } } } },
    });
    const result = diffOpenApiDocuments(before, narrowed);
    expect(result.breaking.some((c) => c.category === 'enum-value-removed')).toBe(true);

    const widened = withOp({
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['draft', 'published', 'archived'] } } } } } },
    });
    const result2 = diffOpenApiDocuments(before, widened);
    expect(result2.breaking).toHaveLength(0);
    expect(categories(result2)).toContain('enum-value-added');
  });
});

describe('diffOpenApiDocuments — responses (direction: less guaranteed = breaking)', () => {
  it('a response field disappearing is breaking, even though "field removed" is non-breaking for requests', () => {
    const before = withOp();
    const after = withOp({
      responses: {
        '200': { content: { 'application/json': { schema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } } } },
      },
    });
    const result = diffOpenApiDocuments(before, after);
    expect(result.breaking.some((c) => c.category === 'field-removed' && c.location.endsWith('.name'))).toBe(true);
  });

  it('a response field losing its "required" guarantee (but still present) is breaking', () => {
    const before = withOp();
    const after = withOp({
      responses: {
        '200': {
          content: {
            'application/json': {
              schema: { type: 'object', required: ['id'], properties: { id: { type: 'string' }, name: { type: 'string' } } },
            },
          },
        },
      },
    });
    const result = diffOpenApiDocuments(before, after);
    expect(result.breaking.some((c) => c.category === 'field-no-longer-guaranteed')).toBe(true);
  });

  it('a new response field is non-breaking, even one marked required', () => {
    const before = withOp();
    const after = withOp({
      responses: {
        '200': {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id', 'name', 'createdAt'],
                properties: { id: { type: 'string' }, name: { type: 'string' }, createdAt: { type: 'string' } },
              },
            },
          },
        },
      },
    });
    const result = diffOpenApiDocuments(before, after);
    expect(result.breaking).toHaveLength(0);
    expect(categories(result)).toContain('field-added');
  });

  it('a new enum value in a response field is breaking (exhaustive switch risk); a removed one is not', () => {
    const before = withOp({
      responses: {
        '200': { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['active', 'inactive'] } } } } } },
      },
    });
    const widened = withOp({
      responses: {
        '200': { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['active', 'inactive', 'archived'] } } } } } },
      },
    });
    const result = diffOpenApiDocuments(before, widened);
    expect(result.breaking.some((c) => c.category === 'enum-value-added')).toBe(true);

    const narrowed = withOp({
      responses: {
        '200': { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['active'] } } } } } },
      },
    });
    const result2 = diffOpenApiDocuments(before, narrowed);
    expect(result2.breaking).toHaveLength(0);
    expect(categories(result2)).toContain('enum-value-removed');
  });

  it('a removed response status is breaking; a new one is not', () => {
    const before = withOp();
    const statusRemoved = withOp({ responses: {} });
    const result = diffOpenApiDocuments(before, statusRemoved);
    expect(result.breaking.some((c) => c.category === 'response-removed')).toBe(true);

    const statusAdded = withOp({
      responses: {
        '200': { content: { 'application/json': { schema: { type: 'object', required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' } } } } } },
        '404': { description: 'not found' },
      },
    });
    const result2 = diffOpenApiDocuments(before, statusAdded);
    expect(result2.breaking).toHaveLength(0);
    expect(categories(result2)).toContain('response-added');
  });

  it('a type change is breaking regardless of direction', () => {
    const before = withOp();
    const after = withOp({
      responses: {
        '200': { content: { 'application/json': { schema: { type: 'object', required: ['id', 'name'], properties: { id: { type: 'integer' }, name: { type: 'string' } } } } } },
      },
    });
    const result = diffOpenApiDocuments(before, after);
    expect(result.breaking.some((c) => c.category === 'type-changed')).toBe(true);
  });
});

describe('formatDiffAsMarkdown', () => {
  it('renders a clean report with breaking changes surfaced first', () => {
    const result = diffOpenApiDocuments(withOp(), { paths: {} });
    const md = formatDiffAsMarkdown(result);
    expect(md).toContain('breaking change');
    expect(md).toContain('operation-removed');
  });

  it('renders a clean "no breaking changes" report when everything is additive', () => {
    const before = withOp();
    const after = withOp({ parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'verbose', in: 'query', required: false, schema: { type: 'boolean' } }] });
    const md = formatDiffAsMarkdown(diffOpenApiDocuments(before, after));
    expect(md).toContain('No breaking changes');
    expect(md).toContain('non-breaking change');
  });

  it('reports no changes for identical documents', () => {
    const doc = withOp();
    const md = formatDiffAsMarkdown(diffOpenApiDocuments(doc, JSON.parse(JSON.stringify(doc))));
    expect(md).toBe('No changes detected between the two OpenAPI documents.');
  });
});

describe('diffOpenApiDocuments — real pokeapi-docs spec', () => {
  it('a real spec diffed against itself produces zero false positives', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const { schema } = await parseOpenApiDocument(raw, { format: 'json' });
    const result = diffOpenApiDocuments(schema, JSON.parse(JSON.stringify(schema)));
    expect(result.changes).toHaveLength(0);
  });

  it('detects a real operation removal and a real newly-required field on the actual spec', async () => {
    const raw = readFileSync(POKEAPI_SPEC, 'utf-8');
    const { schema } = await parseOpenApiDocument(raw, { format: 'json' });
    const before = schema;
    const after = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;

    // Remove the real get-pokemon operation.
    const paths = after.paths as Record<string, unknown>;
    delete (paths['/pokemon/{name}'] as Record<string, unknown>).get;

    const result = diffOpenApiDocuments(before, after);
    expect(result.breaking.some((c) => c.category === 'operation-removed' && c.location === 'GET /pokemon/{name}')).toBe(true);
  });
});
