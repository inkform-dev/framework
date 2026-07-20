/**
 * "Authorizations" section — adapted from the pre-Scalar renderer's
 * AuthSection (git history: api-reference.tsx, deleted in b2a3188).
 */

import type { ApiSecurity } from '../openapi';
import { Section } from './Parameters';

export function SecuritySchemes({ security }: { security: ApiSecurity[] }) {
  if (security.length === 0) return null;
  return (
    <Section title="Authorizations">
      <div className="fw-apiref-auth-list">
        {security.map((s) => (
          <div key={s.key} className="fw-apiref-auth-item">
            <code className="fw-param-name">{s.key}</code>
            <span className="fw-param-type">
              {s.type}
              {s.scheme ? ` (${s.scheme})` : ''}
            </span>
            {s.description ? <p className="fw-param-desc">{s.description}</p> : null}
          </div>
        ))}
      </div>
    </Section>
  );
}
