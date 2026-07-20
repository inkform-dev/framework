/**
 * "Servers" section — the base URL(s) an operation's requests target. New
 * (the pre-Scalar renderer only ever used the first server, silently, for
 * its curl example — it never surfaced the list to the reader).
 */

import type { OpenApiServer } from '../openapi';
import { Section } from './Parameters';

export function Servers({ servers }: { servers: OpenApiServer[] }) {
  if (servers.length === 0) return null;
  return (
    <Section title={servers.length > 1 ? 'Servers' : 'Server'}>
      <div className="fw-apiref-auth-list">
        {servers.map((s) => (
          <div key={s.url} className="fw-apiref-auth-item">
            <code className="fw-param-name">{s.url}</code>
            {s.description ? <p className="fw-param-desc">{s.description}</p> : null}
          </div>
        ))}
      </div>
    </Section>
  );
}
