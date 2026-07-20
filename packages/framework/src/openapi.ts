/**
 * @inkform/framework — OpenAPI 3.x engine
 *
 * Pure module — no React. Parses an OpenAPI 3.x spec (JSON or YAML) into a
 * normalized OpenApiModel, delegating parsing/bundling/dereferencing to
 * `./openapi-engine/parse.ts` (wraps @scalar/json-magic + @scalar/openapi-parser).
 * That engine fully inlines every $ref — local AND external (other files,
 * URLs) — before this file ever sees the document, so nothing here needs to
 * walk `$ref`s itself anymore; this file's only job is narrowing the full
 * dereferenced document down to the small OpenApiModel shape navigation and
 * cross-linking (`<ApiLink>`) actually need.
 */

import { parseOpenApiDocument, type ParseOpenApiEngineOptions } from './openapi-engine/parse';

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

/**
 * Extract a parameter object's fields. `param` is already fully dereferenced
 * (the engine resolves $refs before this file sees anything), so — unlike
 * the pre-engine version of this function — there's no ref-following here.
 */
function derefParam(param: unknown): ApiParam | undefined {
  const p = obj(param);
  if (!p) return undefined;

  const name = str(p.name);
  const inVal = str(p.in);
  if (!name || !['query', 'path', 'header', 'cookie'].includes(inVal ?? '')) return undefined;

  return {
    name,
    in: inVal as ApiParam['in'],
    required: bool(p.required, inVal === 'path'),
    description: str(p.description),
    schema: p.schema as JsonSchema | undefined,
    example: p.example !== undefined ? p.example : undefined,
  };
}

/** Extract body info from an (already dereferenced) requestBody object. */
function extractBody(requestBody: unknown): ApiBody | null {
  const rb = obj(requestBody);
  if (!rb) return null;

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
      : (Object.keys(content)[0] ?? 'application/json');

  const mediaType = obj(content[contentType]);
  const schema = mediaType?.schema as JsonSchema | undefined;
  const example =
    mediaType?.example !== undefined ? mediaType.example : (schema as Record<string, unknown> | undefined)?.example;

  return {
    description: str(rb.description),
    required: bool(rb.required, false),
    contentType,
    schema,
    example,
  };
}

/** Extract response info from an (already dereferenced) response object. */
function extractResponse(status: string, responseRaw: unknown): ApiResponse {
  const r = obj(responseRaw);
  if (!r) return { status, description: undefined };

  const content = obj(r.content);
  if (!content) {
    return { status, description: str(r.description) };
  }

  const contentType =
    'application/json' in content
      ? 'application/json'
      : (Object.keys(content)[0] ?? 'application/json');

  const mediaType = obj(content[contentType]);
  const schema = mediaType?.schema as JsonSchema | undefined;
  const example =
    mediaType?.example !== undefined ? mediaType.example : (schema as Record<string, unknown> | undefined)?.example;

  return {
    status,
    description: str(r.description),
    contentType,
    schema,
    example,
  };
}

/** Extract security schemes from (already dereferenced) components.securitySchemes. */
function extractSecuritySchemes(root: Record<string, unknown>): Map<string, ApiSecurity> {
  const map = new Map<string, ApiSecurity>();
  const components = obj(root.components);
  if (!components) return map;
  const schemes = obj(components.securitySchemes);
  if (!schemes) return map;

  for (const [key, raw] of Object.entries(schemes)) {
    const s = obj(raw);
    if (!s) continue;
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
 * Bundles + fully dereferences $refs (local, cross-file, and cross-URL) via
 * `./openapi-engine/parse.ts`. Never throws on malformed input — defaults
 * gracefully to an empty model, same as before.
 */
export async function parseOpenApi(
  raw: string,
  format?: 'json' | 'yaml',
  options?: Pick<ParseOpenApiEngineOptions, 'baseDir'>,
): Promise<OpenApiModel> {
  const { schema: root } = await parseOpenApiDocument(raw, { format, baseDir: options?.baseDir });

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
    const pathItem = obj(pathItemRaw);
    if (!pathItem) continue;

    // Path-level parameters
    const pathLevelParams: ApiParam[] = [];
    if (Array.isArray(pathItem.parameters)) {
      for (const p of pathItem.parameters) {
        const derefed = derefParam(p);
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
          const derefed = derefParam(p);
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
      const tags = Array.isArray(opRaw.tags) ? (opRaw.tags.filter((t) => typeof t === 'string') as string[]) : [];
      const tag = tags[0] ?? 'default';

      // Track used tags in document order
      if (!usedTagsSet.has(tag)) {
        usedTagsSet.add(tag);
        usedTagsOrder.push(tag);
      }

      // requestBody
      const requestBody = opRaw.requestBody !== undefined ? extractBody(opRaw.requestBody) : null;

      // responses
      const responsesRaw = obj(opRaw.responses) ?? {};
      const responses: ApiResponse[] = Object.entries(responsesRaw).map(([status, resp]) =>
        extractResponse(status, resp),
      );

      // security
      const security = resolveOperationSecurity(opRaw.security, globalSecurity, securitySchemes);

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

  return { info, servers, tags: allTags, operations };
}

// ── findOperation ─────────────────────────────────────────────────────────────

/** Look up an operation by its stable operationId slug. */
export function findOperation(model: OpenApiModel, operationId: string): ApiOperation | null {
  return model.operations.find((op) => op.operationId === operationId) ?? null;
}

// Rendering-only helpers (operationNavGroups, sampleFromSchema, curlExample,
// schemaToTypeLabel, ApiNavGroup) were removed with the old custom renderer
// (api-reference.tsx/api-playground-client.tsx) — Scalar now owns rendering
// entirely. parseOpenApi/findOperation/OpenApiModel/ApiOperation stay: they're
// the validation layer for cross-linking docs pages to specific operations
// (confirming a #tag/<tag>/<method>/<path> reference actually exists in the
// spec before emitting it).
