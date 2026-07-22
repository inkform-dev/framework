/**
 * "Responses" section — adapted from the pre-Scalar renderer's
 * ResponsePanel (git history: api-reference.tsx, deleted in b2a3188), now
 * delegating field rendering to SchemaObject instead of the old
 * properties-only BodyFieldRows.
 */

import type { ApiResponse } from '../openapi';
import { Section } from './Parameters';
import { SchemaFields } from './SchemaObject';

function ResponsePanel({ response }: { response: ApiResponse }) {
  const isOk = response.status.startsWith('2');

  return (
    <details className="fw-response-details" open={isOk}>
      <summary className="fw-response-summary">
        <span className={`fw-response-status fw-response-status--${isOk ? 'ok' : 'err'}`}>{response.status}</span>
        {response.description ? <span className="fw-response-desc">{response.description}</span> : null}
        {response.contentType ? <span className="fw-response-ct">{response.contentType}</span> : null}
      </summary>
      {/* The actual JSON sample renders in the right rail (ResponseSamples,
          alongside the request's CodeSamples) with syntax highlighting and
          a status-code tab switcher, matching the reference layout — this
          column stays schema documentation only, not a second copy of the
          same sample. */}
      {response.schema?.properties ? (
        <div className="fw-response-body">
          <div className="fw-response-fields">
            <SchemaFields schema={response.schema} depth={0} />
          </div>
        </div>
      ) : null}
    </details>
  );
}

export function Responses({ responses }: { responses: ApiResponse[] }) {
  if (responses.length === 0) return null;
  return (
    <Section title="Responses">
      <div className="fw-response-list">
        {responses.map((r) => (
          <ResponsePanel key={r.status} response={r} />
        ))}
      </div>
    </Section>
  );
}
