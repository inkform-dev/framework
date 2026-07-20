/**
 * Synthesize a realistic sample value from a JSON Schema — honors
 * example/default/first-enum, then falls back to type/format heuristics.
 * Used for response-body and code-sample previews.
 *
 * Ported from the pre-Scalar renderer (git history: openapi.ts's
 * sampleFromSchema, deleted in b2a3188) — unchanged logic.
 */

import type { JsonSchema } from '../openapi';

const MAX_SAMPLE_DEPTH = 6;

export function sampleFromSchema(schema?: JsonSchema, _depth = 0): unknown {
  if (!schema) return null;
  if (_depth > MAX_SAMPLE_DEPTH) return null;

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];

  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const merged: Record<string, unknown> = {};
    for (const sub of schema.allOf) {
      const sample = sampleFromSchema(sub, _depth + 1);
      if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
        Object.assign(merged, sample);
      }
    }
    return merged;
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return sampleFromSchema(schema.oneOf[0], _depth + 1);
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return sampleFromSchema(schema.anyOf[0], _depth + 1);
  }

  const type = schema.type;

  if (type === 'string') {
    if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
    if (schema.format === 'date') return '2024-01-01';
    if (schema.format === 'email') return 'user@example.com';
    if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
    if (schema.format === 'uri') return 'https://example.com';
    return '<string>';
  }

  if (type === 'integer' || type === 'number') {
    if (schema.format === 'float' || schema.format === 'double') return 0.0;
    return 0;
  }

  if (type === 'boolean') return true;
  if (type === 'null') return null;

  if (type === 'array') {
    return [sampleFromSchema(schema.items, _depth + 1)];
  }

  if (type === 'object' || schema.properties) {
    const result: Record<string, unknown> = {};
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        result[key] = sampleFromSchema(propSchema, _depth + 1);
      }
    }
    return result;
  }

  return null;
}
