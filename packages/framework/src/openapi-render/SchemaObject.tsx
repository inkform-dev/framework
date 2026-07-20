/**
 * Recursive JSON Schema renderer — the one genuinely hard piece of the
 * native API reference. Handles the composition keywords the pre-Scalar
 * renderer's BodyFieldRows never did (it only walked flat `properties` and
 * fell back to a type-label string for anything else): `oneOf`/`anyOf` as
 * expandable variants, `allOf` as merged properties, arrays unwrapped to
 * their item's own structure, and a depth guard against runaway/cyclic
 * schemas (the engine's dereference() inlines every $ref — including
 * self-referential ones — so a schema like Comment.replies: Comment[]
 * becomes literally recursive data, not just a recursive *type*).
 *
 * Two entry points:
 * - `SchemaFields` renders a schema's *content* (property rows / oneOf
 *   variants / merged allOf) with no row of its own — used at the top of a
 *   request/response body, and inside every `SchemaNode`'s own disclosure.
 * - `SchemaNode` renders ONE named property row (name, type, required,
 *   description) and, if the schema has further structure, wraps
 *   `SchemaFields` in a <details> disclosure.
 */

import type { ReactNode } from 'react';
import type { JsonSchema } from '../openapi';
import { DeprecatedBadge, RequiredBadge } from './badges';
import { schemaToTypeLabel } from './schema-label';

const MAX_SCHEMA_DEPTH = 8;

function mergeAllOf(members: JsonSchema[]): { properties: Record<string, JsonSchema>; required: Set<string> } {
  const properties: Record<string, JsonSchema> = {};
  const required = new Set<string>();
  for (const member of members) {
    if (member.properties) Object.assign(properties, member.properties);
    for (const r of member.required ?? []) required.add(r);
  }
  return { properties, required };
}

/** A schema's content — property rows, oneOf/anyOf variants, or merged allOf. No row of its own. */
export function SchemaFields({ schema, depth }: { schema: JsonSchema; depth: number }): ReactNode {
  if (depth > MAX_SCHEMA_DEPTH) {
    return <p className="fw-param-desc">Nested too deep to expand further.</p>;
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return <SchemaVariants variants={schema.oneOf} depth={depth} />;
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return <SchemaVariants variants={schema.anyOf} depth={depth} />;
  }
  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const { properties, required } = mergeAllOf(schema.allOf);
    if (Object.keys(properties).length === 0) return null;
    return (
      <div className="fw-param-list">
        {Object.entries(properties).map(([key, propSchema]) => (
          <SchemaNode key={key} schema={propSchema} name={key} required={required.has(key)} depth={depth + 1} />
        ))}
      </div>
    );
  }

  if (schema.type === 'array') {
    if (!schema.items) return null;
    return <SchemaFields schema={schema.items} depth={depth + 1} />;
  }

  if (schema.properties) {
    const requiredSet = new Set(schema.required ?? []);
    const entries = Object.entries(schema.properties);
    if (entries.length === 0) return null;
    return (
      <div className="fw-param-list">
        {entries.map(([key, propSchema]) => (
          <SchemaNode key={key} schema={propSchema} name={key} required={requiredSet.has(key)} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return null;
}

function SchemaVariants({ variants, depth }: { variants: JsonSchema[]; depth: number }) {
  return (
    <div className="fw-schema-variants">
      {variants.map((variant, i) => {
        const label = variant.title ?? `Option ${i + 1}`;
        const typeLabel = schemaToTypeLabel(variant);
        const hasFields = variant.properties || variant.oneOf || variant.anyOf || variant.allOf || variant.type === 'array';
        return (
          <details key={i} className="fw-schema-variant" open={i === 0}>
            <summary className="fw-schema-variant-summary">
              <span className="fw-schema-variant-label">{label}</span>
              <span className="fw-param-type">{typeLabel}</span>
            </summary>
            <div className="fw-schema-variant-body">
              {variant.description ? <p className="fw-param-desc">{variant.description}</p> : null}
              {hasFields ? <SchemaFields schema={variant} depth={depth + 1} /> : null}
            </div>
          </details>
        );
      })}
    </div>
  );
}

/** One named property row: name, type, required/deprecated badges, description — expandable if it has nested structure. */
export function SchemaNode({
  schema,
  name,
  required,
  depth,
}: {
  schema: JsonSchema;
  name?: string;
  required?: boolean;
  depth: number;
}): ReactNode {
  const typeLabel = schemaToTypeLabel(schema);
  // Structural check only — NOT gated on depth. The depth cutoff is enforced
  // once, inside SchemaFields, which explains itself when hit; gating here
  // too would silently swap in a bare leaf row instead, leaving the reader
  // with no indication *why* an object-typed field stopped being expandable.
  const hasExpansion =
    schema.properties ||
    schema.oneOf?.length ||
    schema.anyOf?.length ||
    schema.allOf?.length ||
    (schema.type === 'array' && schema.items);

  const header = (
    <div className="fw-param-meta">
      {name ? <code className="fw-param-name">{name}</code> : null}
      <span className="fw-param-type">{typeLabel}</span>
      {required ? <RequiredBadge /> : null}
      {schema.deprecated ? <DeprecatedBadge /> : null}
    </div>
  );

  const description = schema.description ? <p className="fw-param-desc">{schema.description}</p> : null;

  if (!hasExpansion) {
    return (
      <div className="fw-param-row">
        {header}
        {description}
      </div>
    );
  }

  return (
    <details className="fw-param-row fw-param-row--expandable">
      <summary className="fw-param-row-summary">{header}</summary>
      {description}
      <div className="fw-schema-nested">
        <SchemaFields schema={schema} depth={depth} />
      </div>
    </details>
  );
}
