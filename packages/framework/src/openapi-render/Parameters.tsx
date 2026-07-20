/**
 * Path/query/header parameter lists. Adapted from the pre-Scalar renderer's
 * ParamRow/ParamsSection (git history: api-reference.tsx, deleted in
 * b2a3188) — same visual shape, now using SchemaObject's type-label helper
 * instead of a duplicate.
 */

import type { ReactNode } from 'react';
import type { ApiParam } from '../openapi';
import { DeprecatedBadge, RequiredBadge } from './badges';
import { schemaToTypeLabel } from './schema-label';

function ParamRow({ param }: { param: ApiParam }) {
  return (
    <div className="fw-param-row">
      <div className="fw-param-meta">
        <code className="fw-param-name">{param.name}</code>
        <span className="fw-param-type">{schemaToTypeLabel(param.schema)}</span>
        {param.required ? <RequiredBadge /> : null}
        {param.schema?.deprecated ? <DeprecatedBadge /> : null}
      </div>
      {param.description ? <p className="fw-param-desc">{param.description}</p> : null}
      {param.example !== undefined ? (
        <p className="fw-param-example">
          Example: <code>{String(param.example)}</code>
        </p>
      ) : null}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="fw-apiref-section">
      <h3 className="fw-apiref-section-title">{title}</h3>
      {children}
    </section>
  );
}

export function ParamsSection({ label, params }: { label: string; params: ApiParam[] }) {
  if (params.length === 0) return null;
  return (
    <Section title={label}>
      <div className="fw-param-list">
        {params.map((p) => (
          <ParamRow key={`${p.in}-${p.name}`} param={p} />
        ))}
      </div>
    </Section>
  );
}
