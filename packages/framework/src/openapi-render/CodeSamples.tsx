/**
 * Multi-language request code samples, via @scalar/snippetz (locked
 * decision: reuse it rather than home-grow a sampler — it vendors
 * httpsnippet-lite plus its own ~20-language plugin system, confirmed
 * Vue-free: deps are only js-base64, stringify-object, @scalar/helpers, and
 * @scalar/types, the last pulling in zod/nanoid/type-fest and nothing else).
 *
 * No client JS yet (this whole reference is SSR/SSG) — samples are shown as
 * stacked, always-visible blocks rather than a JS tab-switcher. A nicer
 * switcher is natural to add once Try-It (a later phase) needs client
 * interactivity anyway.
 */

import { snippetz } from '@scalar/snippetz';
import type { ApiOperation, OpenApiServer } from '../openapi';
import { sampleFromSchema } from './sample';

type SampleTarget = { target: 'shell'; client: 'curl'; label: 'cURL' } | { target: 'js'; client: 'fetch'; label: 'JavaScript' } | { target: 'python'; client: 'requests'; label: 'Python' } | { target: 'node'; client: 'fetch'; label: 'Node.js' };

const DEFAULT_TARGETS: SampleTarget[] = [
  { target: 'shell', client: 'curl', label: 'cURL' },
  { target: 'js', client: 'fetch', label: 'JavaScript' },
  { target: 'python', client: 'requests', label: 'Python' },
  { target: 'node', client: 'fetch', label: 'Node.js' },
];

function buildHarRequest(operation: ApiOperation, serverUrl: string) {
  const base = serverUrl.replace(/\/$/, '');
  const urlPath = operation.path.replace(/\{([^}]+)\}/g, (_m, name: string) => {
    const param = operation.parameters.find((p) => p.in === 'path' && p.name === name);
    const value = param?.example !== undefined ? String(param.example) : String(sampleFromSchema(param?.schema) ?? name);
    return encodeURIComponent(value);
  });

  const queryParams = operation.parameters.filter((p) => p.in === 'query' && p.required);
  const headers: { name: string; value: string }[] = operation.parameters
    .filter((p) => p.in === 'header')
    .map((p) => ({ name: p.name, value: p.example !== undefined ? String(p.example) : String(sampleFromSchema(p.schema) ?? '') }));

  if (operation.security.length > 0) {
    headers.push({ name: 'Authorization', value: 'Bearer <token>' });
  }

  const queryString = queryParams.map((p) => ({
    name: p.name,
    value: p.example !== undefined ? String(p.example) : String(sampleFromSchema(p.schema) ?? ''),
  }));

  const request: Record<string, unknown> = {
    method: operation.method.toUpperCase(),
    url: `${base}${urlPath}`,
    headers,
    queryString,
  };

  if (operation.requestBody?.schema) {
    const sample = sampleFromSchema(operation.requestBody.schema);
    headers.push({ name: 'Content-Type', value: operation.requestBody.contentType });
    request.postData = {
      mimeType: operation.requestBody.contentType,
      text: JSON.stringify(sample, null, 2),
    };
  }

  return request;
}

export function CodeSamples({
  operation,
  servers,
  baseUrl,
}: {
  operation: ApiOperation;
  servers: OpenApiServer[];
  baseUrl?: string;
}) {
  const serverUrl = baseUrl ?? servers[0]?.url ?? '/';
  const request = buildHarRequest(operation, serverUrl);
  const generator = snippetz();

  return (
    <div className="fw-apiref-rail">
      {DEFAULT_TARGETS.map(({ target, client, label }) => {
        const code = generator.hasPlugin(target, client) ? generator.print(target, client, request) : undefined;
        if (!code) return null;
        return (
          <div key={`${target}/${client}`} className="fw-apiref-sample-block">
            <div className="fw-apiref-sample-header">
              <span className="fw-apiref-sample-lang">{label}</span>
            </div>
            <pre className="fw-apiref-curl">
              <code>{code}</code>
            </pre>
          </div>
        );
      })}
    </div>
  );
}
