/**
 * @inkform/framework — OpenAPI parse/bundle/dereference engine
 *
 * Wraps @scalar/json-magic's bundle() (multi-file + URL $ref resolution) and
 * @scalar/openapi-parser's validate()/dereference() (schema-version-aware
 * validation, full $ref inlining). This is the one capability our own
 * hand-rolled resolver in `../openapi.ts` never had: refs pointing outside
 * the current document. Local-only specs flow through the same path — bundle()
 * is a no-op walk when there's nothing external to resolve.
 *
 * Pure-ish module: the only I/O is what the bundle plugins do (reading local
 * files / fetching URLs referenced BY the spec, via readFiles()/fetchUrls()).
 */

import { bundle } from '@scalar/json-magic/bundle';
import { fetchUrls, readFiles } from '@scalar/json-magic/bundle/plugins/node';
import { dereference, validate } from '@scalar/openapi-parser';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface OpenApiParseError {
  path?: string[];
  message: string;
  code?: string;
}

export interface ParsedOpenApiDocument {
  /** Fully dereferenced document — every $ref (local or bundled-external) inlined. */
  schema: Record<string, unknown>;
  valid: boolean;
  errors: OpenApiParseError[];
}

export interface ParseOpenApiEngineOptions {
  format?: 'json' | 'yaml';
  /**
   * Directory the spec was loaded from, used by the bundler to resolve
   * relative file $refs (e.g. `./schemas/user.yaml`) found inside the
   * document. Absolute paths and URLs resolve without this. Optional
   * because most specs today are single-file with only local (#/...) refs.
   */
  baseDir?: string;
}

const EMPTY_RESULT: ParsedOpenApiDocument = { schema: {}, valid: false, errors: [] };

/**
 * Parse a raw OpenAPI 3.x spec string (JSON or YAML), bundle any external
 * (file/URL) $refs it contains, then fully dereference the result.
 *
 * Never throws — matches `openapi.ts`'s existing best-effort contract.
 * Malformed input degrades to an empty schema with `valid: false`.
 */
export async function parseOpenApiDocument(
  raw: string,
  options: ParseOpenApiEngineOptions = {},
): Promise<ParsedOpenApiDocument> {
  let parsed: unknown;
  try {
    if (options.format === 'yaml') {
      parsed = parseYaml(raw);
    } else if (options.format === 'json') {
      parsed = JSON.parse(raw);
    } else {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = parseYaml(raw);
      }
    }
  } catch {
    return { ...EMPTY_RESULT, errors: [{ message: 'Could not parse input as JSON or YAML.' }] };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ...EMPTY_RESULT, errors: [{ message: 'Parsed document is not an object.' }] };
  }

  return bundleAndDereference(parsed as Record<string, unknown>, options.baseDir);
}

/** Same as `parseOpenApiDocument`, but for a document that's already a JS object. */
export async function bundleAndDereference(
  document: Record<string, unknown>,
  baseDir?: string,
): Promise<ParsedOpenApiDocument> {
  try {
    // @scalar/json-magic's bundler resolves relative $refs via
    // `path.resolve(path.dirname(origin), relativeRef)` — i.e. it expects
    // `origin` to look like a FILE path, not a directory (confirmed by
    // reading resolve-reference-path.js). Append a synthetic filename so
    // `dirname()` recovers baseDir exactly, rather than baseDir's parent.
    const origin = baseDir ? path.join(baseDir, '__entry__.yaml') : undefined;

    const bundled = (await bundle(document, {
      plugins: [readFiles(), fetchUrls()],
      treeShake: true,
      ...(origin ? { origin } : {}),
    })) as Record<string, unknown>;

    const [validation, dereferenced] = await Promise.all([
      validate(bundled).catch(
        (e): { valid: false; errors: OpenApiParseError[] } => ({
          valid: false,
          errors: [{ message: e instanceof Error ? e.message : 'Validation failed.' }],
        }),
      ),
      Promise.resolve(dereference(bundled)),
    ]);

    const schema = (dereferenced.schema ?? bundled) as Record<string, unknown>;
    const errors: OpenApiParseError[] = [
      ...(validation.errors ?? []),
      ...(dereferenced.errors ?? []),
    ];

    return { schema, valid: validation.valid, errors };
  } catch (e) {
    return {
      ...EMPTY_RESULT,
      schema: document,
      errors: [{ message: e instanceof Error ? e.message : 'Bundling/dereferencing failed.' }],
    };
  }
}
