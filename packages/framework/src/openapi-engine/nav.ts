/**
 * @inkform/framework — OpenAPI navigation tree
 *
 * Pure function: a dereferenced OpenAPI document (from `./parse.ts`) -> a nav
 * tree of tag-groups (each holding its operations), top-level webhooks, and
 * component-schema models. This is the single structure everything else
 * renders and indexes from — the native sidebar (Phase 2), the per-operation
 * routes (Phase 2), and search facets (Phase 1/5) all walk this same tree
 * instead of re-deriving it from the raw schema.
 *
 * Scope: OpenAPI 3.0/3.1 REST + webhooks. AsyncAPI/3.2 constructs are not
 * read (locked decision — see the execution plan's §B.7).
 */

export type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'head'
  | 'options'
  | 'trace';

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

export interface NavOperationEntry {
  kind: 'operation';
  operationId: string;
  method: HttpMethod;
  path: string;
  summary: string;
  deprecated: boolean;
}

export interface NavWebhookEntry {
  kind: 'webhook';
  name: string;
  method: HttpMethod;
  summary: string;
  deprecated: boolean;
}

export interface NavModelEntry {
  kind: 'model';
  name: string;
  title?: string;
  description?: string;
}

export interface NavTagGroup {
  kind: 'tag-group';
  tag: string;
  description?: string;
  operations: NavOperationEntry[];
}

export interface OpenApiNavTree {
  tagGroups: NavTagGroup[];
  webhooks: NavWebhookEntry[];
  models: NavModelEntry[];
}

/** Name used for operations with no tags, matching openapi.ts's existing convention. */
const UNTAGGED_GROUP = 'default';

function obj(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function bool(v: unknown): boolean {
  return v === true;
}

/** Build the ordered list of tag-groups: spec.tags order first, then any tags used only in document order. */
function orderTagGroups(schema: Record<string, unknown>, usedTags: Iterable<string>): NavTagGroup[] {
  const specTags = Array.isArray(schema.tags) ? schema.tags : [];
  const groups: NavTagGroup[] = [];
  const seen = new Set<string>();

  for (const t of specTags) {
    const tv = obj(t);
    const name = tv && str(tv.name);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const group: NavTagGroup = { kind: 'tag-group', tag: name, operations: [] };
    const desc = tv && str(tv.description);
    if (desc !== undefined) group.description = desc;
    groups.push(group);
  }

  for (const name of usedTags) {
    if (seen.has(name)) continue;
    seen.add(name);
    groups.push({ kind: 'tag-group', tag: name, operations: [] });
  }

  return groups;
}

/** Walk `paths` (or `webhooks`) into a flat list of operation/webhook entries, grouped by tag in document order. */
function collectOperations(
  container: unknown,
): { byTag: Map<string, NavOperationEntry[]>; flat: NavOperationEntry[] } {
  const byTag = new Map<string, NavOperationEntry[]>();
  const flat: NavOperationEntry[] = [];
  const pathsRaw = obj(container) ?? {};

  for (const [itemPath, pathItemRaw] of Object.entries(pathsRaw)) {
    const pathItem = obj(pathItemRaw);
    if (!pathItem) continue;

    for (const method of HTTP_METHODS) {
      const opRaw = obj(pathItem[method]);
      if (!opRaw) continue;

      const tags = Array.isArray(opRaw.tags)
        ? (opRaw.tags.filter((t) => typeof t === 'string') as string[])
        : [];
      const tag = tags[0] ?? UNTAGGED_GROUP;

      const entry: NavOperationEntry = {
        kind: 'operation',
        operationId: str(opRaw.operationId) ?? `${method}-${itemPath}`,
        method,
        path: itemPath,
        summary: str(opRaw.summary) ?? str(opRaw.description) ?? `${method.toUpperCase()} ${itemPath}`,
        deprecated: bool(opRaw.deprecated),
      };

      flat.push(entry);
      const bucket = byTag.get(tag);
      if (bucket) {
        bucket.push(entry);
      } else {
        byTag.set(tag, [entry]);
      }
    }
  }

  return { byTag, flat };
}

function collectWebhooks(document: Record<string, unknown>): NavWebhookEntry[] {
  const webhooksRaw = obj(document.webhooks) ?? {};
  const out: NavWebhookEntry[] = [];

  for (const [name, pathItemRaw] of Object.entries(webhooksRaw)) {
    const pathItem = obj(pathItemRaw);
    if (!pathItem) continue;

    for (const method of HTTP_METHODS) {
      const opRaw = obj(pathItem[method]);
      if (!opRaw) continue;

      out.push({
        kind: 'webhook',
        name,
        method,
        summary: str(opRaw.summary) ?? str(opRaw.description) ?? `${method.toUpperCase()} ${name}`,
        deprecated: bool(opRaw.deprecated),
      });
    }
  }

  return out;
}

function collectModels(document: Record<string, unknown>): NavModelEntry[] {
  const schemas = obj(obj(document.components)?.schemas) ?? {};
  const out: NavModelEntry[] = [];

  for (const [name, schemaRaw] of Object.entries(schemas)) {
    const s = obj(schemaRaw);
    const entry: NavModelEntry = { kind: 'model', name };
    const title = s && str(s.title);
    if (title !== undefined) entry.title = title;
    const description = s && str(s.description);
    if (description !== undefined) entry.description = description;
    out.push(entry);
  }

  return out;
}

/**
 * Build the nav tree from a dereferenced OpenAPI document (`parseOpenApiDocument().schema`).
 * Orphan operations (no tags) land in a synthetic "default" tag-group, matching
 * `openapi.ts`'s existing convention rather than being dropped.
 */
export function buildNavTree(document: Record<string, unknown>): OpenApiNavTree {
  const { byTag } = collectOperations(document.paths);
  const tagGroups = orderTagGroups(document, byTag.keys());

  // Attach operations to their groups (including the synthetic "default" group,
  // if any untagged operations exist and weren't already added via spec.tags).
  for (const [tag, ops] of byTag) {
    let group = tagGroups.find((g) => g.tag === tag);
    if (!group) {
      group = { kind: 'tag-group', tag, operations: [] };
      tagGroups.push(group);
    }
    group.operations.push(...ops);
  }

  return {
    tagGroups: tagGroups.filter((g) => g.operations.length > 0),
    webhooks: collectWebhooks(document),
    models: collectModels(document),
  };
}
