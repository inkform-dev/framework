/**
 * Human-readable type labels for a (fully dereferenced) JsonSchema.
 * Examples: "string", "integer<int32>", "array<string>", "string | null",
 * "enum(a, b, c)".
 *
 * Ported from the pre-Scalar renderer (git history: api-reference.tsx's
 * schemaToTypeLabel, deleted in b2a3188) — same shape, plus enum value
 * listing the original didn't have.
 */

import type { JsonSchema } from '../openapi';

export function schemaToTypeLabel(schema?: JsonSchema): string {
  if (!schema) return 'unknown';

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const values = schema.enum.map((v) => JSON.stringify(v)).join(', ');
    return schema.nullable ? `enum(${values}) | null` : `enum(${values})`;
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const label = schema.oneOf.map((s) => schemaToTypeLabel(s)).join(' | ');
    return schema.nullable ? `${label} | null` : label;
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    const label = schema.anyOf.map((s) => schemaToTypeLabel(s)).join(' | ');
    return schema.nullable ? `${label} | null` : label;
  }
  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    return schema.nullable ? 'object | null' : 'object';
  }

  const type = schema.type ?? (schema.properties ? 'object' : 'unknown');

  let label: string;
  if (type === 'array') {
    label = `array<${schema.items ? schemaToTypeLabel(schema.items) : 'unknown'}>`;
  } else if (schema.format) {
    label = `${type}<${schema.format}>`;
  } else {
    label = type;
  }

  return schema.nullable ? `${label} | null` : label;
}
