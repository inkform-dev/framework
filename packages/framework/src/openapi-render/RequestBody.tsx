/**
 * "Request Body" section — adapted from the pre-Scalar renderer's
 * BodySection (git history: api-reference.tsx, deleted in b2a3188), now
 * delegating field rendering to SchemaObject instead of the old
 * properties-only BodyFieldRows (so oneOf/anyOf/allOf request bodies expand
 * properly instead of collapsing to a bare type label).
 */

import type { ApiBody } from '../openapi';
import { Section } from './Parameters';
import { RequiredBadge } from './badges';
import { SchemaFields } from './SchemaObject';

export function RequestBody({ body }: { body: ApiBody }) {
  return (
    <Section title="Request Body">
      <div className="fw-apiref-body">
        {body.description ? <p className="fw-param-desc">{body.description}</p> : null}
        <p className="fw-apiref-body-ct">
          Content-Type: <code>{body.contentType}</code>
          {body.required ? <RequiredBadge /> : null}
        </p>
        {body.schema ? <SchemaFields schema={body.schema} depth={0} /> : null}
      </div>
    </Section>
  );
}
