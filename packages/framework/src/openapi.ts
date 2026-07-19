/**
 * @inkform/framework — OpenAPI 3.x engine
 *
 * Pure module — no React, no node:fs. Parses an OpenAPI 3.x spec (JSON or YAML)
 * into a normalized OpenApiModel. Resolves local $ref references (guards against
 * cycles), merges path-item and operation parameters, and provides helpers for
 * navigation, samples, cURL examples, and type labels.
 *
 * Dependencies: `yaml` (already in package.json)
 */

import { parse as parseYaml } from 'yaml';

// ── Frozen types ──────────────────────────────────────────────────────────────

export type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'head'
  | 'options'
  | 'trace';

export interface JsonSchema {
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  example?: unknown;
  default?: unknown;
  nullable?: boolean;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  $ref?: string;
  [k: string]: unknown;
}

export interface OpenApiInfo {
  title: string;
  version: string;
  description?: string;
}

export interface OpenApiServer {
  url: string;
  description?: string;
}

export interface ApiParam {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required: boolean;
  description?: string;
  schema?: JsonSchema;
  example?: unknown;
}

export interface ApiBody {
  description?: string;
  required: boolean;
  contentType: string;
  schema?: JsonSchema;
  example?: unknown;
}

export interface ApiResponse {
  status: string;
  description?: string;
  contentType?: string;
  schema?: JsonSchema;
  example?: unknown;
}

export interface ApiSecurity {
  key: string;
  type: string;
  scheme?: string;
  name?: string;
  in?: string;
  description?: string;
}

export interface ApiOperation {
  method: HttpMethod;
  path: string;
  operationId: string;
  summary: string;
  description?: string;
  tag: string;
  deprecated?: boolean;
  parameters: ApiParam[];
  requestBody?: ApiBody | null;
  responses: ApiResponse[];
  security: ApiSecurity[];
}

export interface OpenApiModel {
  info: OpenApiInfo;
  servers: OpenApiServer[];
  tags: { name: string; description?: string }[];
  operations: ApiOperation[];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const HTTP_METHODS: HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace',
];

/**
 * Slugify a string to a stable, URL-safe identifier.
 * Lowercases, replaces non-alphanumeric chars with '-', collapses repeated '-'.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

/** Safe object access — returns `undefined` if `obj` is not an object. */
function obj(v: unknown): Record<string, unknown> | undefined {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/** Resolve a local JSON Reference string like "#/components/schemas/Foo" to its object in root. */
function resolveRef(
  root: Record<string, unknown>,
  ref: string,
  visited: Set<string>,
  depth: number,
): unknown {
  if (depth > 10) return undefined;
  if (visited.has(ref)) return undefined;
  // Only handle local refs (#/...)
  if (!ref.startsWith('#/')) return { $ref: ref }; // leave external refs as-is
  const parts = ref.slice(2).split('/').map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let cur: unknown = root;
  for (const part of parts) {
    const o = obj(cur);
    if (!o) return undefined;
    cur = o[part];
  }
  // Recursively resolve if the result itself has a $ref
  const result = obj(cur);
  if (result && typeof result.$ref === 'string') {
    const nextRef = result.$ref;
    const nextVisited = new Set(visited);
    nextVisited.add(ref);
    return resolveRef(root, nextRef, nextVisited, depth + 1);
  }
  return cur;
}

/** Dereference a schema node (and its children) against the spec root. */
function derefSchema(
  root: Record<string, unknown>,
  schema: unknown,
  visited: Set<string>,
  depth: number,
): JsonSchema | undefined {
  if (depth > 10) return undefined;
  const s = obj(schema);
  if (!s) return undefined;

  if (typeof s.$ref === 'string') {
    // resolveRef tracks ref cycles itself; pass the CURRENT visited set (do NOT pre-add this
    // ref) so the first resolution is not immediately rejected by resolveRef's own visited
    // guard — pre-adding made every $ref schema resolve to undefined.
    const resolved = resolveRef(root, s.$ref, visited, depth + 1);
    const nextVisited = new Set(visited);
    nextVisited.add(s.$ref);
    return derefSchema(root, resolved, nextVisited, depth + 1);
  }

  // Shallow copy, then recursively deref nested schemas
  const out: JsonSchema = { ...s } as JsonSchema;

  if (s.properties && typeof s.properties === 'object') {
    const props: Record<string, JsonSchema> = {};
    for (const [k, v] of Object.entries(s.properties as Record<string, unknown>)) {
      const derefed = derefSchema(root, v, visited, depth + 1);
      if (derefed) props[k] = derefed;
    }
    out.properties = props;
  }

  if (s.items) {
    out.items = derefSchema(root, s.items, visited, depth + 1);
  }

  for (const key of ['oneOf', 'anyOf', 'allOf'] as const) {
    if (Array.isArray(s[key])) {
      out[key] = (s[key] as unknown[])
        .map((v) => derefSchema(root, v, visited, depth + 1))
        .filter((v): v is JsonSchema => v !== undefined);
    }
  }

  return out;
}

/** Dereference a parameter object (may itself be a $ref). */
function derefParam(
  root: Record<string, unknown>,
  param: unknown,
  depth = 0,
): ApiParam | undefined {
  if (depth > 10) return undefined;
  let p = obj(param);
  if (!p) return undefined;

  if (typeof p.$ref === 'string') {
    const resolved = resolveRef(root, p.$ref, new Set([p.$ref]), depth + 1);
    p = obj(resolved);
    if (!p) return undefined;
  }

  const name = str(p.name);
  const inVal = str(p.in);
  if (!name || !['query', 'path', 'header', 'cookie'].includes(inVal ?? '')) return undefined;

  const schema = derefSchema(root, p.schema, new Set(), depth + 1);

  return {
    name,
    in: inVal as ApiParam['in'],
    required: bool(p.required, inVal === 'path'),
    description: str(p.description),
    schema,
    example: p.example !== undefined ? p.example : undefined,
  };
}

/** Extract body info from a requestBody object. */
function extractBody(
  root: Record<string, unknown>,
  requestBody: unknown,
  depth = 0,
): ApiBody | null {
  let rb = obj(requestBody);
  if (!rb) return null;

  if (typeof rb.$ref === 'string') {
    const resolved = resolveRef(root, rb.$ref, new Set([rb.$ref]), depth + 1);
    rb = obj(resolved);
    if (!rb) return null;
  }

  const content = obj(rb.content);
  if (!content) {
    return {
      description: str(rb.description),
      required: bool(rb.required, false),
      contentType: 'application/json',
      schema: undefined,
      example: undefined,
    };
  }

  // Prefer application/json, else first content type
  const contentType =
    'application/json' in content
      ? 'application/json'
      : Object.keys(content)[0] ?? 'application/json';

  const mediaType = obj(content[contentType]);
  const schema = mediaType ? derefSchema(root, mediaType.schema, new Set(), depth + 1) : undefined;
  const example =
    mediaType?.example !== undefined
      ? mediaType.example
      : (schema as Record<string, unknown> | undefined)?.example;

  return {
    description: str(rb.description),
    required: bool(rb.required, false),
    contentType,
    schema,
    example,
  };
}

/** Extract response info from a response object. */
function extractResponse(
  root: Record<string, unknown>,
  status: string,
  responseRaw: unknown,
  depth = 0,
): ApiResponse {
  let r = obj(responseRaw);
  if (!r) return { status, description: undefined };

  if (typeof r.$ref === 'string') {
    const resolved = resolveRef(root, r.$ref, new Set([r.$ref]), depth + 1);
    r = obj(resolved) ?? r;
  }

  const content = obj(r.content);
  if (!content) {
    return { status, description: str(r.description) };
  }

  const contentType =
    'application/json' in content
      ? 'application/json'
      : Object.keys(content)[0] ?? 'application/json';

  const mediaType = obj(content[contentType]);
  const schema = mediaType ? derefSchema(root, mediaType.schema, new Set(), depth + 1) : undefined;
  const example =
    mediaType?.example !== undefined
      ? mediaType.example
      : (schema as Record<string, unknown> | undefined)?.example;

  return {
    status,
    description: str(r.description),
    contentType,
    schema,
    example,
  };
}

/** Extract security scheme from components.securitySchemes. */
function extractSecuritySchemes(
  root: Record<string, unknown>,
): Map<string, ApiSecurity> {
  const map = new Map<string, ApiSecurity>();
  const components = obj(root.components);
  if (!components) return map;
  const schemes = obj(components.securitySchemes);
  if (!schemes) return map;

  for (const [key, raw] of Object.entries(schemes)) {
    let s = obj(raw);
    if (!s) continue;
    if (typeof s.$ref === 'string') {
      const resolved = resolveRef(root, s.$ref, new Set([s.$ref]), 0);
      s = obj(resolved) ?? s;
    }
    map.set(key, {
      key,
      type: str(s.type) ?? 'apiKey',
      scheme: str(s.scheme),
      name: str(s.name),
      in: str(s.in),
      description: str(s.description),
    });
  }

  return map;
}

/** Resolve operation-level security requirements into ApiSecurity[]. */
function resolveOperationSecurity(
  securityReqs: unknown,
  globalSecurity: unknown,
  securitySchemes: Map<string, ApiSecurity>,
): ApiSecurity[] {
  const reqs = Array.isArray(securityReqs)
    ? securityReqs
    : Array.isArray(globalSecurity)
      ? globalSecurity
      : [];

  const out: ApiSecurity[] = [];
  const seen = new Set<string>();

  for (const req of reqs) {
    const r = obj(req);
    if (!r) continue;
    for (const key of Object.keys(r)) {
      if (seen.has(key)) continue;
      seen.add(key);
      const scheme = securitySchemes.get(key);
      if (scheme) {
        out.push(scheme);
      } else {
        // Scheme referenced but not defined — include a stub
        out.push({ key, type: 'apiKey' });
      }
    }
  }

  return out;
}

// ── parseOpenApi ──────────────────────────────────────────────────────────────

/**
 * Parse a raw OpenAPI 3.x spec string (JSON or YAML) into an OpenApiModel.
 * If `format` is omitted, auto-detects by trying JSON.parse first, then YAML.
 * Resolves local $refs. Never throws on malformed input — defaults gracefully.
 */
export function parseOpenApi(raw: string, format?: 'json' | 'yaml'): OpenApiModel {
  let parsed: unknown;

  try {
    if (format === 'yaml') {
      parsed = parseYaml(raw);
    } else if (format === 'json') {
      parsed = JSON.parse(raw);
    } else {
      // Auto-detect: try JSON first, fall back to YAML
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = parseYaml(raw);
      }
    }
  } catch {
    parsed = {};
  }

  const root = obj(parsed) ?? {};

  // ── info ────────────────────────────────────────────────────────────────────
  const infoRaw = obj(root.info) ?? {};
  const info: OpenApiInfo = {
    title: str(infoRaw.title) ?? 'API Reference',
    version: str(infoRaw.version) ?? '1.0.0',
    description: str(infoRaw.description),
  };

  // ── servers ─────────────────────────────────────────────────────────────────
  const serversRaw = Array.isArray(root.servers) ? root.servers : [];
  let servers: OpenApiServer[];
  if (serversRaw.length > 0) {
    const mapped: OpenApiServer[] = [];
    for (const s of serversRaw) {
      const sv = obj(s);
      if (!sv) continue;
      const url = str(sv.url);
      if (!url) continue;
      const entry: OpenApiServer = { url };
      const desc = str(sv.description);
      if (desc !== undefined) entry.description = desc;
      mapped.push(entry);
    }
    servers = mapped.length > 0 ? mapped : [{ url: '/' }];
  } else {
    servers = [{ url: '/' }];
  }

  // ── global tags (spec.tags) ─────────────────────────────────────────────────
  const specTags = Array.isArray(root.tags) ? root.tags : [];
  const specTagList: { name: string; description?: string }[] = [];
  for (const t of specTags) {
    const tv = obj(t);
    if (!tv) continue;
    const name = str(tv.name);
    if (!name) continue;
    const entry: { name: string; description?: string } = { name };
    const desc = str(tv.description);
    if (desc !== undefined) entry.description = desc;
    specTagList.push(entry);
  }

  // ── security schemes ────────────────────────────────────────────────────────
  const securitySchemes = extractSecuritySchemes(root);
  const globalSecurity = root.security;

  // ── path-level parameters (merged with op-level later) ──────────────────────
  const pathsRaw = obj(root.paths) ?? {};

  // Track tags used in document order (for tags not in spec.tags)
  const usedTagsOrder: string[] = [];
  const usedTagsSet = new Set<string>();

  // Pre-build specTagNames for fast lookup
  const specTagNames = new Set(specTagList.map((t) => t.name));

  const operations: ApiOperation[] = [];

  for (const [apiPath, pathItemRaw] of Object.entries(pathsRaw)) {
    let pathItem = obj(pathItemRaw);
    if (!pathItem) continue;

    // Dereference path item $ref
    if (typeof pathItem.$ref === 'string') {
      const resolved = resolveRef(root, pathItem.$ref, new Set([pathItem.$ref]), 0);
      pathItem = obj(resolved) ?? pathItem;
    }

    // Path-level parameters
    const pathLevelParams: ApiParam[] = [];
    if (Array.isArray(pathItem.parameters)) {
      for (const p of pathItem.parameters) {
        const derefed = derefParam(root, p);
        if (derefed) pathLevelParams.push(derefed);
      }
    }

    for (const method of HTTP_METHODS) {
      const opRaw = obj(pathItem[method]);
      if (!opRaw) continue;

      // Operation-level parameters (override path-level on name+in)
      const opParams: ApiParam[] = [];
      if (Array.isArray(opRaw.parameters)) {
        for (const p of opRaw.parameters) {
          const derefed = derefParam(root, p);
          if (derefed) opParams.push(derefed);
        }
      }

      // Merge: op params override path params on (name, in)
      const paramMap = new Map<string, ApiParam>();
      for (const p of pathLevelParams) paramMap.set(`${p.name}::${p.in}`, p);
      for (const p of opParams) paramMap.set(`${p.name}::${p.in}`, p);
      const parameters = Array.from(paramMap.values());

      // operationId
      const specOpId = str(opRaw.operationId);
      const operationId = specOpId ?? slugify(`${method}-${apiPath}`);

      // tag
      const tags = Array.isArray(opRaw.tags) ? opRaw.tags.filter((t) => typeof t === 'string') as string[] : [];
      const tag = tags[0] ?? 'default';

      // Track used tags in document order
      if (!usedTagsSet.has(tag)) {
        usedTagsSet.add(tag);
        usedTagsOrder.push(tag);
      }

      // requestBody
      const requestBody = opRaw.requestBody !== undefined
        ? extractBody(root, opRaw.requestBody)
        : null;

      // responses
      const responsesRaw = obj(opRaw.responses) ?? {};
      const responses: ApiResponse[] = Object.entries(responsesRaw).map(([status, resp]) =>
        extractResponse(root, status, resp),
      );

      // security
      const security = resolveOperationSecurity(
        opRaw.security,
        globalSecurity,
        securitySchemes,
      );

      operations.push({
        method,
        path: apiPath,
        operationId,
        summary: str(opRaw.summary) ?? str(opRaw.description) ?? `${method.toUpperCase()} ${apiPath}`,
        description: str(opRaw.description),
        tag,
        deprecated: bool(opRaw.deprecated, false),
        parameters,
        requestBody,
        responses,
        security,
      });
    }
  }

  // Build final tag list: spec tags first (preserving their order), then
  // any tags used in document order that aren't in spec.tags.
  const allTags: { name: string; description?: string }[] = [...specTagList];
  for (const tagName of usedTagsOrder) {
    if (!specTagNames.has(tagName)) {
      allTags.push({ name: tagName });
    }
  }

  // If no tags were used and no spec tags, emit nothing
  return { info, servers, tags: allTags, operations };
}

// ── findOperation ─────────────────────────────────────────────────────────────

/** Look up an operation by its stable operationId slug. */
export function findOperation(
  model: OpenApiModel,
  operationId: string,
): ApiOperation | null {
  return model.operations.find((op) => op.operationId === operationId) ?? null;
}

// Rendering-only helpers (operationNavGroups, sampleFromSchema, curlExample,
// schemaToTypeLabel, ApiNavGroup) were removed with the old custom renderer
// (api-reference.tsx/api-playground-client.tsx) — Scalar now owns rendering
// entirely. parseOpenApi/findOperation/OpenApiModel/ApiOperation stay: they're
// the validation layer for cross-linking docs pages to specific operations
// (confirming a #tag/<tag>/<method>/<path> reference actually exists in the
// spec before emitting it).
