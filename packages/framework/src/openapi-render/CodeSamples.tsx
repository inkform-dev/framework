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
import { CodeSamplesPanel } from './CodeSamplesPanel';
import { highlightCode } from './highlight';
import { sampleFromSchema } from './sample';

type SampleTarget =
  | { target: 'shell'; client: 'curl'; label: 'cURL'; lang: 'bash' }
  | { target: 'js'; client: 'fetch'; label: 'JavaScript'; lang: 'javascript' }
  | { target: 'python'; client: 'requests'; label: 'Python'; lang: 'python' }
  | { target: 'node'; client: 'fetch'; label: 'Node.js'; lang: 'javascript' };

const DEFAULT_TARGETS: SampleTarget[] = [
  { target: 'shell', client: 'curl', label: 'cURL', lang: 'bash' },
  { target: 'js', client: 'fetch', label: 'JavaScript', lang: 'javascript' },
  { target: 'python', client: 'requests', label: 'Python', lang: 'python' },
  { target: 'node', client: 'fetch', label: 'Node.js', lang: 'javascript' },
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

export async function CodeSamples({
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

  const samples = await Promise.all(
    DEFAULT_TARGETS.map(async ({ target, client, label, lang }) => {
      const code = generator.hasPlugin(target, client) ? generator.print(target, client, request) : undefined;
      if (!code) return null;
      const html = await highlightCode(code, lang);
      return { label, lang: `${target}/${client}`, code, html };
    }),
  );

  const real = samples.filter((s): s is NonNullable<typeof s> => s !== null);
  if (real.length === 0) return null;

  return <CodeSamplesPanel samples={real} />;
}
