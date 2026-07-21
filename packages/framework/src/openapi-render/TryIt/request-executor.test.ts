import { describe, expect, it, vi } from 'vitest';
import type { ApiOperation } from '../../openapi';
import { buildTryItRequest, executeTryItRequest } from './request-executor';

function op(overrides: Partial<ApiOperation> = {}): ApiOperation {
  return {
    method: 'get',
    path: '/widgets/{id}',
    operationId: 'getWidget',
    summary: 'Get a widget',
    tag: 'widgets',
    parameters: [],
    requestBody: null,
    responses: [],
    security: [],
    ...overrides,
  };
}

describe('buildTryItRequest', () => {
  it('substitutes path params and appends query params', () => {
    const request = buildTryItRequest({
      operation: op(),
      serverUrl: 'https://api.example.com/v1',
      pathValues: { id: 'abc 123' },
      queryValues: { verbose: 'true', empty: '' },
      headerValues: {},
      auth: [],
    });

    expect(request.url).toBe('https://api.example.com/v1/widgets/abc%20123?verbose=true');
    expect(request.method).toBe('GET');
  });

  it('strips a trailing slash on the server URL before joining the path', () => {
    const request = buildTryItRequest({
      operation: op(),
      serverUrl: 'https://api.example.com/v1/',
      pathValues: { id: '1' },
      queryValues: {},
      headerValues: {},
      auth: [],
    });
    expect(request.url).toBe('https://api.example.com/v1/widgets/1');
  });

  it('sets custom header params', () => {
    const request = buildTryItRequest({
      operation: op(),
      serverUrl: 'https://api.example.com',
      pathValues: { id: '1' },
      queryValues: {},
      headerValues: { 'X-Trace-Id': 'trace-1', Empty: '' },
      auth: [],
    });
    expect(request.headers.get('X-Trace-Id')).toBe('trace-1');
    expect(request.headers.has('Empty')).toBe(false);
  });

  it('applies apiKey auth in a header', () => {
    const request = buildTryItRequest({
      operation: op({ security: [{ key: 'apiKeyAuth', type: 'apiKey', in: 'header', name: 'X-API-Key' }] }),
      serverUrl: 'https://api.example.com',
      pathValues: { id: '1' },
      queryValues: {},
      headerValues: {},
      auth: [{ scheme: { key: 'apiKeyAuth', type: 'apiKey', in: 'header', name: 'X-API-Key' }, value: 'secret-key' }],
    });
    expect(request.headers.get('X-API-Key')).toBe('secret-key');
  });

  it('applies apiKey auth as a query param', () => {
    const request = buildTryItRequest({
      operation: op({ security: [{ key: 'apiKeyAuth', type: 'apiKey', in: 'query', name: 'api_key' }] }),
      serverUrl: 'https://api.example.com',
      pathValues: { id: '1' },
      queryValues: {},
      headerValues: {},
      auth: [{ scheme: { key: 'apiKeyAuth', type: 'apiKey', in: 'query', name: 'api_key' }, value: 'secret-key' }],
    });
    expect(request.url).toContain('api_key=secret-key');
  });

  it('applies http bearer auth', () => {
    const request = buildTryItRequest({
      operation: op({ security: [{ key: 'bearerAuth', type: 'http', scheme: 'bearer' }] }),
      serverUrl: 'https://api.example.com',
      pathValues: { id: '1' },
      queryValues: {},
      headerValues: {},
      auth: [{ scheme: { key: 'bearerAuth', type: 'http', scheme: 'bearer' }, value: 'tok_abc123' }],
    });
    expect(request.headers.get('Authorization')).toBe('Bearer tok_abc123');
  });

  it('applies http basic auth, base64-encoding user:pass', () => {
    const request = buildTryItRequest({
      operation: op({ security: [{ key: 'basicAuth', type: 'http', scheme: 'basic' }] }),
      serverUrl: 'https://api.example.com',
      pathValues: { id: '1' },
      queryValues: {},
      headerValues: {},
      auth: [{ scheme: { key: 'basicAuth', type: 'http', scheme: 'basic' }, value: 'alice:hunter2' }],
    });
    expect(request.headers.get('Authorization')).toBe(`Basic ${btoa('alice:hunter2')}`);
  });

  it('sends a JSON body with the operation\'s content type for a write method', async () => {
    const request = buildTryItRequest({
      operation: op({
        method: 'post',
        requestBody: { required: true, contentType: 'application/json', schema: undefined },
      }),
      serverUrl: 'https://api.example.com',
      pathValues: { id: '1' },
      queryValues: {},
      headerValues: {},
      auth: [],
      bodyText: '{"name":"Gizmo"}',
    });
    expect(request.method).toBe('POST');
    expect(request.headers.get('Content-Type')).toBe('application/json');
    expect(await request.text()).toBe('{"name":"Gizmo"}');
  });

  it('sends FormData without manually setting Content-Type, letting the platform generate the boundary itself', () => {
    const fd = new FormData();
    fd.append('name', 'Gizmo');
    const request = buildTryItRequest({
      operation: op({
        method: 'post',
        requestBody: { required: true, contentType: 'multipart/form-data', schema: undefined },
      }),
      serverUrl: 'https://api.example.com',
      pathValues: { id: '1' },
      queryValues: {},
      headerValues: {},
      auth: [],
      bodyFormData: fd,
    });
    // The Request constructor auto-generates a boundary-bearing Content-Type
    // as soon as it sees a FormData body — our code must never override that
    // with the operation's plain "multipart/form-data" (no boundary), which
    // would produce a header the server can't actually parse.
    expect(request.headers.get('Content-Type')).toMatch(/^multipart\/form-data; boundary=/);
  });

  it('sends no body for a GET even if bodyText is somehow set', () => {
    const request = buildTryItRequest({
      operation: op({ method: 'get' }),
      serverUrl: 'https://api.example.com',
      pathValues: { id: '1' },
      queryValues: {},
      headerValues: {},
      auth: [],
      bodyText: '{"should":"not appear"}',
    });
    expect(request.headers.has('Content-Type')).toBe(false);
  });
});

describe('executeTryItRequest', () => {
  it('calls onChunk incrementally as a streamed response arrives, and the final result has the full body', async () => {
    // A real network response's chunking is out of our control (and not
    // something to rely on a live server for in a test) — build a synthetic
    // multi-chunk stream instead, so the incremental-rendering path is
    // actually exercised deterministically.
    const chunks = ['{"progress":', '25}\n{"progress":', '75}\n{"progress":100,"done":true}'];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    });
    const response = new Response(stream, { status: 200, statusText: 'OK', headers: { 'X-Test': '1' } });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response);

    const seenSnapshots: string[] = [];
    const result = await executeTryItRequest(new Request('https://example.com'), (accumulated) => {
      seenSnapshots.push(accumulated);
    });

    expect(seenSnapshots.length).toBeGreaterThanOrEqual(2); // proves it fired more than once, i.e. incrementally
    expect(seenSnapshots[0].length).toBeLessThan(result.bodyText.length); // first snapshot is a strict prefix
    expect(result.bodyText).toBe(chunks.join(''));
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.headers).toContainEqual(['x-test', '1']);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    vi.restoreAllMocks();
  });

  it('never throws on a network failure — reports it in `error` instead', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await executeTryItRequest(new Request('https://does-not-exist.example.invalid'));

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toContain('Failed to fetch');

    vi.restoreAllMocks();
  });
});
