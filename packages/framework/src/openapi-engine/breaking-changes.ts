/**
 * Breaking-change detection between two versions of a dereferenced OpenAPI
 * document (`parseOpenApiDocument().schema`, before and after). Pure, no IO.
 *
 * The core asymmetry this gets right: breaking-ness depends on which side of
 * the wire a schema describes. For a REQUEST (parameters, request bodies), a
 * client is at risk when the server now demands MORE than before (a new
 * required field, a narrower enum). For a RESPONSE, a client is at risk when
 * the server now promises LESS than before (a field silently disappears, an
 * enum gains a value an exhaustive switch/case doesn't handle). Treating both
 * directions the same way — as most naive "did the schema change" diffs do —
 * produces both false positives (flagging a new optional response field as
 * breaking) and false negatives (missing a response field quietly becoming
 * unguaranteed).
 *
 * Deliberately not attempted: `$ref`-identity-aware diffing (the input is
 * already fully dereferenced, so two structurally-identical inline schemas
 * that used to be different named refs look identical — fine, since callers
 * care about wire-contract changes, not spec authoring style), and
 * cross-field constraints (`oneOf`/`anyOf` branch semantics) beyond a
 * structural walk of `properties`/`required`/`enum`/`type`/`items`.
 */

export type ChangeSeverity = 'breaking' | 'non-breaking';
type SchemaContext = 'request' | 'response';

export interface SpecChange {
  severity: ChangeSeverity;
  /** Short machine-stable tag, e.g. 'operation-removed', 'field-now-required'. */
  category: string;
  /** Human-readable location, e.g. "GET /pokemon/{name} > requestBody (application/json) > name". */
  location: string;
  message: string;
}

export interface DiffResult {
  changes: SpecChange[];
  breaking: SpecChange[];
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'] as const;
const MAX_SCHEMA_DEPTH = 12;

function obj(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function bool(v: unknown): boolean {
  return v === true;
}
function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function push(
  changes: SpecChange[],
  severity: ChangeSeverity,
  category: string,
  location: string,
  message: string,
): void {
  changes.push({ severity, category, location, message });
}

// ── operations ───────────────────────────────────────────────────────────────

function collectOperations(document: Record<string, unknown>): Map<string, Record<string, unknown>> {
  const out = new Map<string, Record<string, unknown>>();
  const paths = obj(document.paths) ?? {};
  for (const [itemPath, pathItemRaw] of Object.entries(paths)) {
    const pathItem = obj(pathItemRaw);
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const op = obj(pathItem[method]);
      if (op) out.set(`${method.toUpperCase()} ${itemPath}`, op);
    }
  }
  return out;
}

export function diffOpenApiDocuments(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): DiffResult {
  const changes: SpecChange[] = [];
  const beforeOps = collectOperations(before);
  const afterOps = collectOperations(after);

  for (const [location, beforeOp] of beforeOps) {
    const afterOp = afterOps.get(location);
    if (!afterOp) {
      push(changes, 'breaking', 'operation-removed', location, 'This operation was removed.');
      continue;
    }
    diffOperation(location, beforeOp, afterOp, changes);
  }
  for (const location of afterOps.keys()) {
    if (!beforeOps.has(location)) {
      push(changes, 'non-breaking', 'operation-added', location, 'A new operation was added.');
    }
  }

  return { changes, breaking: changes.filter((c) => c.severity === 'breaking') };
}

function diffOperation(
  location: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  changes: SpecChange[],
): void {
  if (!bool(before.deprecated) && bool(after.deprecated)) {
    push(changes, 'non-breaking', 'operation-deprecated', location, 'This operation was marked deprecated.');
  }

  diffParameters(location, before.parameters, after.parameters, changes);
  diffRequestBody(location, before.requestBody, after.requestBody, changes);
  diffResponses(location, before.responses, after.responses, changes);
  diffSecurity(location, before.security, after.security, changes);
}

// ── parameters ───────────────────────────────────────────────────────────────

function paramKey(p: Record<string, unknown>): string {
  return `${str(p.in) ?? '?'}:${str(p.name) ?? '?'}`;
}

function diffParameters(location: string, beforeRaw: unknown, afterRaw: unknown, changes: SpecChange[]): void {
  const beforeList = (Array.isArray(beforeRaw) ? beforeRaw : []).map(obj).filter((p): p is Record<string, unknown> => !!p);
  const afterList = (Array.isArray(afterRaw) ? afterRaw : []).map(obj).filter((p): p is Record<string, unknown> => !!p);
  const beforeMap = new Map(beforeList.map((p) => [paramKey(p), p]));
  const afterMap = new Map(afterList.map((p) => [paramKey(p), p]));

  for (const [key, bp] of beforeMap) {
    const name = str(bp.name) ?? key;
    const paramLocation = `${location} > parameter ${name} (${str(bp.in)})`;
    const ap = afterMap.get(key);
    if (!ap) {
      push(changes, 'breaking', 'parameter-removed', paramLocation, `Parameter '${name}' was removed.`);
      continue;
    }
    const wasRequired = bool(bp.required);
    const isRequired = bool(ap.required);
    if (!wasRequired && isRequired) {
      push(changes, 'breaking', 'parameter-now-required', paramLocation, `Parameter '${name}' became required.`);
    } else if (wasRequired && !isRequired) {
      push(changes, 'non-breaking', 'parameter-now-optional', paramLocation, `Parameter '${name}' became optional.`);
    }
    diffSchema(paramLocation, bp.schema, ap.schema, 'request', changes);
  }
  for (const [key, ap] of afterMap) {
    if (beforeMap.has(key)) continue;
    const name = str(ap.name) ?? key;
    const paramLocation = `${location} > parameter ${name} (${str(ap.in)})`;
    if (bool(ap.required)) {
      push(changes, 'breaking', 'parameter-added-required', paramLocation, `New required parameter '${name}' was added — existing clients don't send it.`);
    } else {
      push(changes, 'non-breaking', 'parameter-added', paramLocation, `New optional parameter '${name}' was added.`);
    }
  }
}

// ── request body ─────────────────────────────────────────────────────────────

function diffRequestBody(location: string, beforeRaw: unknown, afterRaw: unknown, changes: SpecChange[]): void {
  const before = obj(beforeRaw);
  const after = obj(afterRaw);
  if (before && !after) {
    push(changes, 'breaking', 'request-body-removed', location, 'The request body was removed.');
    return;
  }
  if (!before && after) {
    push(
      changes,
      bool(after.required) ? 'breaking' : 'non-breaking',
      'request-body-added',
      location,
      bool(after.required) ? 'A new required request body was added.' : 'A new optional request body was added.',
    );
    return;
  }
  if (!before || !after) return;

  if (!bool(before.required) && bool(after.required)) {
    push(changes, 'breaking', 'request-body-now-required', location, 'The request body became required.');
  }

  const beforeContent = obj(before.content) ?? {};
  const afterContent = obj(after.content) ?? {};
  for (const [contentType, beforeMedia] of Object.entries(beforeContent)) {
    const bodyLocation = `${location} > requestBody (${contentType})`;
    const afterMedia = obj(afterContent[contentType]);
    if (!afterMedia) {
      push(changes, 'breaking', 'request-content-type-removed', bodyLocation, `Content type '${contentType}' is no longer accepted.`);
      continue;
    }
    diffSchema(bodyLocation, obj(beforeMedia)?.schema, afterMedia.schema, 'request', changes);
  }
  for (const contentType of Object.keys(afterContent)) {
    if (!(contentType in beforeContent)) {
      push(changes, 'non-breaking', 'request-content-type-added', `${location} > requestBody (${contentType})`, `Content type '${contentType}' is now accepted.`);
    }
  }
}

// ── responses ────────────────────────────────────────────────────────────────

function diffResponses(location: string, beforeRaw: unknown, afterRaw: unknown, changes: SpecChange[]): void {
  const before = obj(beforeRaw) ?? {};
  const after = obj(afterRaw) ?? {};

  for (const [status, beforeRespRaw] of Object.entries(before)) {
    const respLocation = `${location} > response ${status}`;
    const afterRespRaw = after[status];
    if (afterRespRaw === undefined) {
      push(changes, 'breaking', 'response-removed', respLocation, `Response ${status} was removed.`);
      continue;
    }
    const beforeContent = obj(obj(beforeRespRaw)?.content) ?? {};
    const afterContent = obj(obj(afterRespRaw)?.content) ?? {};
    for (const [contentType, beforeMedia] of Object.entries(beforeContent)) {
      const mediaLocation = `${respLocation} (${contentType})`;
      const afterMedia = obj(afterContent[contentType]);
      if (!afterMedia) {
        push(changes, 'breaking', 'response-content-type-removed', mediaLocation, `Content type '${contentType}' is no longer returned.`);
        continue;
      }
      diffSchema(mediaLocation, obj(beforeMedia)?.schema, afterMedia.schema, 'response', changes);
    }
  }
  for (const status of Object.keys(after)) {
    if (!(status in before)) {
      push(changes, 'non-breaking', 'response-added', `${location} > response ${status}`, `Response ${status} was added.`);
    }
  }
}

// ── security ─────────────────────────────────────────────────────────────────

function diffSecurity(location: string, beforeRaw: unknown, afterRaw: unknown, changes: SpecChange[]): void {
  const before = Array.isArray(beforeRaw) ? beforeRaw : [];
  const after = Array.isArray(afterRaw) ? afterRaw : [];
  if (before.length === 0 && after.length > 0) {
    push(changes, 'breaking', 'security-added', location, 'Authentication is now required where it previously was not.');
  } else if (before.length > 0 && after.length === 0) {
    push(changes, 'non-breaking', 'security-removed', location, 'Authentication is no longer required.');
  }
}

// ── schema (recursive; direction-aware) ────────────────────────────────────────

function diffSchema(
  location: string,
  beforeRaw: unknown,
  afterRaw: unknown,
  context: SchemaContext,
  changes: SpecChange[],
  depth = 0,
): void {
  if (depth > MAX_SCHEMA_DEPTH) return;
  const before = obj(beforeRaw);
  const after = obj(afterRaw);
  if (!before || !after) return; // nothing to compare structurally — not a signal either way

  const beforeType = str(before.type);
  const afterType = str(after.type);
  if (beforeType && afterType && beforeType !== afterType) {
    push(changes, 'breaking', 'type-changed', location, `Type changed from '${beforeType}' to '${afterType}'.`);
  }

  diffEnum(location, before.enum, after.enum, context, changes);

  const beforeRequired = new Set(strArray(before.required));
  const afterRequired = new Set(strArray(after.required));
  const newlyRequired = [...afterRequired].filter((f) => !beforeRequired.has(f));
  const noLongerRequired = [...beforeRequired].filter((f) => !afterRequired.has(f));

  if (context === 'request' && newlyRequired.length > 0) {
    push(changes, 'breaking', 'field-now-required', location, `Field(s) now required: ${newlyRequired.join(', ')}.`);
  }
  if (context === 'response' && noLongerRequired.length > 0) {
    push(changes, 'breaking', 'field-no-longer-guaranteed', location, `Field(s) no longer guaranteed in the response: ${noLongerRequired.join(', ')}.`);
  }

  const beforeProps = obj(before.properties) ?? {};
  const afterProps = obj(after.properties) ?? {};

  for (const [key, beforePropSchema] of Object.entries(beforeProps)) {
    const propLocation = `${location}.${key}`;
    const afterPropSchema = afterProps[key];
    if (afterPropSchema === undefined) {
      if (context === 'response') {
        push(changes, 'breaking', 'field-removed', propLocation, `Field '${key}' was removed from the response.`);
      } else if (beforeRequired.has(key)) {
        push(changes, 'breaking', 'field-removed', propLocation, `Required request field '${key}' was removed.`);
      } else {
        push(changes, 'non-breaking', 'field-removed', propLocation, `Optional request field '${key}' was removed.`);
      }
      continue;
    }
    diffSchema(propLocation, beforePropSchema, afterPropSchema, context, changes, depth + 1);
  }
  for (const key of Object.keys(afterProps)) {
    if (key in beforeProps) continue;
    const propLocation = `${location}.${key}`;
    // Newly-required fields are already reported once at the object level
    // above (field-now-required) — avoid duplicate per-field noise here.
    if (context === 'request' && afterRequired.has(key)) continue;
    push(changes, 'non-breaking', 'field-added', propLocation, `Field '${key}' was added.`);
  }

  if (before.items !== undefined || after.items !== undefined) {
    diffSchema(`${location}[]`, before.items, after.items, context, changes, depth + 1);
  }
}

function diffEnum(location: string, beforeRaw: unknown, afterRaw: unknown, context: SchemaContext, changes: SpecChange[]): void {
  const beforeEnum = Array.isArray(beforeRaw) ? beforeRaw : undefined;
  const afterEnum = Array.isArray(afterRaw) ? afterRaw : undefined;
  if (!beforeEnum && !afterEnum) return;

  const beforeSet = new Set((beforeEnum ?? []).map((v) => JSON.stringify(v)));
  const afterSet = new Set((afterEnum ?? []).map((v) => JSON.stringify(v)));
  const removed = [...beforeSet].filter((v) => !afterSet.has(v)).map((v) => JSON.parse(v));
  const added = [...afterSet].filter((v) => !beforeSet.has(v)).map((v) => JSON.parse(v));

  if (context === 'request') {
    if (removed.length > 0) {
      push(changes, 'breaking', 'enum-value-removed', location, `Value(s) no longer accepted: ${removed.join(', ')} — a client sending one of these now fails.`);
    }
    if (added.length > 0) {
      push(changes, 'non-breaking', 'enum-value-added', location, `Value(s) now accepted: ${added.join(', ')}.`);
    }
  } else {
    if (added.length > 0) {
      push(changes, 'breaking', 'enum-value-added', location, `New possible value(s) in the response: ${added.join(', ')} — a client that exhaustively handles this field's values may not expect them.`);
    }
    if (removed.length > 0) {
      push(changes, 'non-breaking', 'enum-value-removed', location, `Value(s) no longer returned: ${removed.join(', ')}.`);
    }
  }
}

// ── formatting ───────────────────────────────────────────────────────────────

/** Renders a diff result as a Markdown report — suitable for a CI job to post as a PR comment. */
export function formatDiffAsMarkdown(result: DiffResult): string {
  if (result.changes.length === 0) return 'No changes detected between the two OpenAPI documents.';

  const lines: string[] = [];
  if (result.breaking.length > 0) {
    lines.push(`## ⚠️ ${result.breaking.length} breaking change${result.breaking.length === 1 ? '' : 's'}`, '');
    for (const c of result.breaking) lines.push(`- **${c.location}** — ${c.message} \`(${c.category})\``);
    lines.push('');
  } else {
    lines.push('## ✅ No breaking changes', '');
  }

  const nonBreaking = result.changes.filter((c) => c.severity === 'non-breaking');
  if (nonBreaking.length > 0) {
    lines.push(`<details><summary>${nonBreaking.length} non-breaking change${nonBreaking.length === 1 ? '' : 's'}</summary>`, '');
    for (const c of nonBreaking) lines.push(`- **${c.location}** — ${c.message} \`(${c.category})\``);
    lines.push('', '</details>');
  }

  return lines.join('\n');
}
