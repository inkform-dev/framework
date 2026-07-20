/**
 * @inkform/framework — OpenAPI -> Markdown
 *
 * Native serializer from a dereferenced OpenAPI document (`./parse.ts`) to
 * Markdown: one function for the whole document (ordered via `./nav.ts`,
 * feeds `/llms.txt`) and one for a single operation (feeds per-operation
 * indexable text, and later an MCP `get_operation` tool).
 *
 * Deliberately NOT a wrapper around @scalar/openapi-to-markdown: that
 * package renders through a real Vue SSR pass (`createSSRApp` +
 * `vue/server-renderer`, confirmed by reading its compiled output) and pulls
 * `vue` + `@scalar/components` into this framework's dependency tree as a
 * result. A hand-rolled serializer over data we're already deriving (the nav
 * tree, the dereferenced schema) is a small amount of code and keeps
 * @inkform/framework Vue-free.
 */

import { buildNavTree, type HttpMethod } from './nav';

function obj(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/** One-line human-readable type summary for a (dereferenced) JSON Schema node. */
function summarizeSchema(schema: unknown): string {
  const s = obj(schema);
  if (!s) return 'any';

  if (Array.isArray(s.oneOf)) return (s.oneOf as unknown[]).map(summarizeSchema).join(' | ');
  if (Array.isArray(s.anyOf)) return (s.anyOf as unknown[]).map(summarizeSchema).join(' | ');
  if (Array.isArray(s.allOf)) return (s.allOf as unknown[]).map(summarizeSchema).join(' & ');

  if (Array.isArray(s.enum)) return `enum(${s.enum.map((v) => JSON.stringify(v)).join(', ')})`;

  const type = str(s.type);
  if (type === 'array') return `array<${summarizeSchema(s.items)}>`;
  if (type === 'object') {
    const props = obj(s.properties);
    return props ? `object{${Object.keys(props).join(', ')}}` : 'object';
  }
  return type ?? 'any';
}

interface OperationLocation {
  path: string;
  method: HttpMethod;
}

/** Locate one operation's raw (dereferenced) node by path+method, or by operationId. */
function findOperationNode(
  document: Record<string, unknown>,
  selector: OperationLocation | { operationId: string },
): { path: string; method: HttpMethod; op: Record<string, unknown> } | null {
  const paths = obj(document.paths) ?? {};
  const methods: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

  for (const [p, pathItemRaw] of Object.entries(paths)) {
    const pathItem = obj(pathItemRaw);
    if (!pathItem) continue;
    for (const method of methods) {
      const op = obj(pathItem[method]);
      if (!op) continue;
      if ('operationId' in selector) {
        if (str(op.operationId) === selector.operationId) return { path: p, method, op };
      } else if (p === selector.path && method === selector.method) {
        return { path: p, method, op };
      }
    }
  }
  return null;
}

function renderParametersTable(parameters: unknown): string[] {
  if (!Array.isArray(parameters) || parameters.length === 0) return [];
  const lines = ['| Name | In | Required | Type | Description |', '|---|---|---|---|---|'];
  for (const raw of parameters) {
    const p = obj(raw);
    if (!p) continue;
    const name = str(p.name) ?? '';
    const location = str(p.in) ?? '';
    const required = p.required === true ? 'yes' : 'no';
    const type = summarizeSchema(p.schema);
    const description = (str(p.description) ?? '').replace(/\n/g, ' ');
    lines.push(`| ${name} | ${location} | ${required} | ${type} | ${description} |`);
  }
  return lines.length > 2 ? lines : [];
}

function renderRequestBody(requestBody: unknown): string[] {
  const rb = obj(requestBody);
  if (!rb) return [];
  const content = obj(rb.content) ?? {};
  const lines = ['**Request body:**', ''];
  if (str(rb.description)) lines.push(str(rb.description) as string, '');
  for (const [contentType, mediaTypeRaw] of Object.entries(content)) {
    const mediaType = obj(mediaTypeRaw);
    lines.push(`- \`${contentType}\`: ${summarizeSchema(mediaType?.schema)}`);
  }
  lines.push('');
  return lines;
}

function renderResponses(responses: unknown): string[] {
  const r = obj(responses) ?? {};
  const entries = Object.entries(r);
  if (entries.length === 0) return [];
  const lines = ['**Responses:**', ''];
  for (const [status, respRaw] of entries) {
    const resp = obj(respRaw);
    const description = (str(resp?.description) ?? '').trim();
    const content = obj(resp?.content) ?? {};
    const contentType = Object.keys(content)[0];
    const schemaSummary = contentType ? ` — \`${contentType}\`: ${summarizeSchema(obj(content[contentType])?.schema)}` : '';
    lines.push(`- \`${status}\`: ${description}${schemaSummary}`);
  }
  lines.push('');
  return lines;
}

/** Render a single operation (by path+method or operationId) as Markdown. Empty string if not found. */
export function renderOperationMarkdown(
  document: Record<string, unknown>,
  selector: OperationLocation | { operationId: string },
): string {
  const found = findOperationNode(document, selector);
  if (!found) return '';
  const { path, method, op } = found;

  const summary = str(op.summary) ?? str(op.description) ?? `${method.toUpperCase()} ${path}`;
  const lines: string[] = [`## ${summary}`, '', `\`${method.toUpperCase()} ${path}\``, ''];

  if (str(op.description) && str(op.description) !== summary) {
    lines.push(str(op.description) as string, '');
  }
  if (op.deprecated === true) lines.push('> **Deprecated.**', '');

  const parameterLines = renderParametersTable(op.parameters);
  lines.push(...parameterLines);
  if (parameterLines.length > 0) lines.push('');
  lines.push(...renderRequestBody(op.requestBody));
  lines.push(...renderResponses(op.responses));

  return lines.join('\n').trimEnd() + '\n';
}

/** Render the whole document as Markdown: title/description, then each tag-group's operations in order. */
export function renderOpenApiMarkdown(document: Record<string, unknown>): string {
  const info = obj(document.info) ?? {};
  const title = str(info.title) ?? 'API Reference';
  const description = str(info.description);

  const sections: string[] = [`# ${title}`, ''];
  if (description) sections.push(description, '');

  const tree = buildNavTree(document);

  for (const group of tree.tagGroups) {
    sections.push(`# ${group.tag}`, '');
    if (group.description) sections.push(group.description, '');
    for (const entry of group.operations) {
      sections.push(renderOperationMarkdown(document, { path: entry.path, method: entry.method }));
    }
  }

  if (tree.webhooks.length > 0) {
    sections.push('# Webhooks', '');
    const webhooksRaw = obj(document.webhooks) ?? {};
    for (const hook of tree.webhooks) {
      const pathItem = obj(webhooksRaw[hook.name]);
      const op = pathItem ? obj(pathItem[hook.method]) : undefined;
      if (!op) continue;
      const summary = hook.summary;
      const lines = [`## ${summary}`, '', `Webhook: \`${hook.method.toUpperCase()} ${hook.name}\``, ''];
      if (str(op.description)) lines.push(str(op.description) as string, '');
      lines.push(...renderResponses(op.responses));
      sections.push(lines.join('\n').trimEnd() + '\n');
    }
  }

  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
