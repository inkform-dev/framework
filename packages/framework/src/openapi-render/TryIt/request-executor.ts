/**
 * Native fetch-based request execution for Try-It — no Scalar dependency.
 * @scalar/api-client (the plan's originally-considered reuse target) was
 * checked: every one of its ~40 subpath exports is a Vue component/block/
 * feature (vue, @vueuse/*, radix-vue, @headlessui/vue, @scalar/components
 * in its own dependency list), no separable pure-logic core. Built fresh
 * instead, matching this project's standing "no Scalar/Vue dependency at
 * any point" decision.
 *
 * Deliberately NOT parsing Set-Cookie: browser fetch() never exposes that
 * header to JavaScript regardless of CORS config (a fixed browser security
 * restriction, not a bug) — the plan's original task list mentioned
 * set-cookie-parser because @scalar/api-client also runs in non-browser
 * contexts (Electron, a server-side proxy) where that header IS visible.
 * Ours only ever runs in a regular browser tab. Cookie-based auth still
 * works (the browser's own cookie jar sends/receives them normally) — we
 * just can't display the raw header value, which would be misleading to
 * implement as if we could.
 */

import type { ApiOperation, ApiSecurity } from '../../openapi';

export interface TryItAuthValue {
  scheme: ApiSecurity;
  /** apiKey value, bearer token, or "username:password" for http/basic. */
  value: string;
}

export interface TryItRequestInput {
  operation: ApiOperation;
  serverUrl: string;
  pathValues: Record<string, string>;
  queryValues: Record<string, string>;
  headerValues: Record<string, string>;
  auth: TryItAuthValue[];
  /** Selected content type for the request body, if the operation has one. */
  bodyContentType?: string;
  /** Raw text body (JSON or other text-based content types). */
  bodyText?: string;
  /** multipart/form-data body — mutually exclusive with bodyText. */
  bodyFormData?: FormData;
}

function applyAuth(url: URL, headers: Headers, auth: TryItAuthValue[]) {
  for (const { scheme, value } of auth) {
    if (!value) continue;
    if (scheme.type === 'apiKey') {
      if (scheme.in === 'header' && scheme.name) headers.set(scheme.name, value);
      else if (scheme.in === 'query' && scheme.name) url.searchParams.set(scheme.name, value);
      // in: 'cookie' apiKey schemes aren't handled — same Set-Cookie-visibility
      // constraint as above applies in reverse (JS can't set a cookie for a
      // cross-origin request either); document.cookie only works same-origin.
    } else if (scheme.type === 'http') {
      if (scheme.scheme === 'bearer') headers.set('Authorization', `Bearer ${value}`);
      else if (scheme.scheme === 'basic') headers.set('Authorization', `Basic ${btoa(value)}`);
    }
  }
}

/** Builds the actual Request object from an operation + user-supplied values. Pure — no network call. */
export function buildTryItRequest(input: TryItRequestInput): Request {
  const { operation, serverUrl, pathValues, queryValues, headerValues, auth } = input;

  let path = operation.path;
  for (const [name, value] of Object.entries(pathValues)) {
    path = path.replace(`{${name}}`, encodeURIComponent(value));
  }

  const base = serverUrl.replace(/\/$/, '');
  const url = new URL(`${base}${path}`);
  for (const [name, value] of Object.entries(queryValues)) {
    if (value !== '') url.searchParams.set(name, value);
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(headerValues)) {
    if (value !== '') headers.set(name, value);
  }
  applyAuth(url, headers, auth);

  const writeMethods = new Set(['post', 'put', 'patch', 'delete']);
  let body: BodyInit | undefined;
  if (writeMethods.has(operation.method) && operation.requestBody) {
    if (input.bodyFormData) {
      body = input.bodyFormData;
      // Do NOT set Content-Type for FormData — fetch sets it (with the
      // multipart boundary) automatically, and setting it manually breaks
      // the boundary parameter the server needs to parse the body at all.
    } else if (input.bodyText !== undefined) {
      body = input.bodyText;
      headers.set('Content-Type', input.bodyContentType ?? operation.requestBody.contentType);
    }
  }

  return new Request(url, { method: operation.method.toUpperCase(), headers, body });
}

export interface TryItResult {
  ok: boolean;
  status: number;
  statusText: string;
  headers: [string, string][];
  bodyText: string;
  durationMs: number;
  error?: string;
}

/**
 * Executes a request, optionally streaming the response body via onChunk
 * (called once per chunk as it arrives, for the response viewer's
 * incremental rendering). Never throws — network/CORS failures land in
 * `error` on the result.
 */
export async function executeTryItRequest(
  request: Request,
  onChunk?: (accumulated: string) => void,
): Promise<TryItResult> {
  const start = performance.now();
  try {
    const response = await fetch(request);
    const headers: [string, string][] = [];
    response.headers.forEach((value, key) => headers.push([key, value]));

    let bodyText = '';
    const reader = response.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bodyText += decoder.decode(value, { stream: true });
        onChunk?.(bodyText);
      }
    } else {
      bodyText = await response.text();
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers,
      bodyText,
      durationMs: performance.now() - start,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      statusText: '',
      headers: [],
      bodyText: '',
      durationMs: performance.now() - start,
      error: e instanceof Error ? e.message : 'Request failed — likely a network or CORS error.',
    };
  }
}
