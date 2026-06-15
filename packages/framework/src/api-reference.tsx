import type { ReactNode } from 'react';
import type {
  ApiOperation,
  OpenApiServer,
  ApiParam,
  ApiResponse,
  ApiBody,
  ApiSecurity,
  JsonSchema,
} from './openapi';
import { curlExample, sampleFromSchema, schemaToTypeLabel } from './openapi';
import { ApiPlayground } from './api-playground-client';

/* ─────────────────────────────────────────────
   Re-export ApiPlayground for convenience
───────────────────────────────────────────── */
export { ApiPlayground } from './api-playground-client';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function MethodPill({ method }: { method: string }) {
  return (
    <span className={`fw-method-pill fw-method-${method.toLowerCase()}`}>
      {method.toUpperCase()}
    </span>
  );
}

function RequiredBadge() {
  return <span className="fw-param-required">required</span>;
}

function DeprecatedBadge() {
  return <span className="fw-param-deprecated">deprecated</span>;
}

/* ─────────────────────────────────────────────
   Param row
───────────────────────────────────────────── */

function ParamRow({ param }: { param: ApiParam }) {
  return (
    <div className="fw-param-row">
      <div className="fw-param-meta">
        <code className="fw-param-name">{param.name}</code>
        <span className="fw-param-type">{schemaToTypeLabel(param.schema)}</span>
        {param.required ? <RequiredBadge /> : null}
      </div>
      {param.description ? (
        <p className="fw-param-desc">{param.description}</p>
      ) : null}
      {param.example !== undefined ? (
        <p className="fw-param-example">
          Example: <code>{String(param.example)}</code>
        </p>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Body field rows (recurse into object properties)
───────────────────────────────────────────── */

function BodyFieldRows({
  schema,
  prefix,
  required,
}: {
  schema: JsonSchema;
  prefix?: string;
  required?: boolean;
}) {
  const props = schema.properties;
  if (!props) {
    // Leaf / scalar
    return (
      <div className="fw-param-row">
        <div className="fw-param-meta">
          {prefix ? <code className="fw-param-name">{prefix}</code> : null}
          <span className="fw-param-type">{schemaToTypeLabel(schema)}</span>
          {required ? <RequiredBadge /> : null}
        </div>
        {schema.description ? (
          <p className="fw-param-desc">{schema.description}</p>
        ) : null}
      </div>
    );
  }

  const reqSet = new Set(schema.required ?? []);
  return (
    <>
      {Object.entries(props).map(([key, sub]) => (
        <BodyFieldRows
          key={key}
          schema={sub}
          prefix={prefix ? `${prefix}.${key}` : key}
          required={reqSet.has(key)}
        />
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────
   Response tabs (client-side tabs state is needed)
   We'll use a simple server-safe accordion approach
   with <details> for status codes.
───────────────────────────────────────────── */

function ResponsePanel({ response }: { response: ApiResponse }) {
  const sample = sampleFromSchema(response.schema);
  const isOk = response.status.startsWith('2');

  return (
    <details className="fw-response-details" open={isOk}>
      <summary className="fw-response-summary">
        <span className={`fw-response-status fw-response-status--${isOk ? 'ok' : 'err'}`}>
          {response.status}
        </span>
        {response.description ? (
          <span className="fw-response-desc">{response.description}</span>
        ) : null}
        {response.contentType ? (
          <span className="fw-response-ct">{response.contentType}</span>
        ) : null}
      </summary>
      {response.schema || sample !== undefined ? (
        <div className="fw-response-body">
          {response.schema?.properties ? (
            <div className="fw-response-fields">
              <BodyFieldRows schema={response.schema} />
            </div>
          ) : null}
          {sample !== undefined ? (
            <pre className="fw-response-sample">
              <code>{JSON.stringify(sample, null, 2)}</code>
            </pre>
          ) : null}
        </div>
      ) : null}
    </details>
  );
}

/* ─────────────────────────────────────────────
   Right rail — cURL + samples
───────────────────────────────────────────── */

function RightRail({
  operation,
  servers,
  baseUrl,
}: {
  operation: ApiOperation;
  servers: OpenApiServer[];
  baseUrl?: string;
}) {
  const serverUrl = baseUrl ?? servers[0]?.url ?? '/';
  const curl = curlExample(operation, serverUrl);

  // Find 2xx and first error response
  const successResp = operation.responses.find((r) => r.status.startsWith('2'));
  const errorResp = operation.responses.find((r) => !r.status.startsWith('2'));

  const successSample = sampleFromSchema(successResp?.schema);
  const errorSample = sampleFromSchema(errorResp?.schema);

  return (
    <div className="fw-apiref-rail">
      {/* cURL block */}
      <div className="fw-apiref-sample-block">
        <div className="fw-apiref-sample-header">
          <span className="fw-apiref-sample-lang">cURL</span>
        </div>
        <pre className="fw-apiref-curl">
          <code>{curl}</code>
        </pre>
      </div>

      {/* Response sample tabs */}
      {(successSample !== undefined || errorSample !== undefined) && (
        <div className="fw-apiref-sample-block">
          <div className="fw-apiref-sample-header">
            <span className="fw-apiref-sample-lang">Response</span>
          </div>
          {successResp && successSample !== undefined ? (
            <div className="fw-apiref-response-sample">
              <div className="fw-apiref-status-badge fw-apiref-status-ok">
                {successResp.status}
              </div>
              <pre className="fw-apiref-sample-json">
                <code>{JSON.stringify(successSample, null, 2)}</code>
              </pre>
            </div>
          ) : null}
          {errorResp && errorSample !== undefined ? (
            <div className="fw-apiref-response-sample">
              <div className="fw-apiref-status-badge fw-apiref-status-err">
                {errorResp.status}
              </div>
              <pre className="fw-apiref-sample-json">
                <code>{JSON.stringify(errorSample, null, 2)}</code>
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section helper
───────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="fw-apiref-section">
      <h3 className="fw-apiref-section-title">{title}</h3>
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────────
   Security / Authorizations section
───────────────────────────────────────────── */

function AuthSection({ security }: { security: ApiSecurity[] }) {
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

/* ─────────────────────────────────────────────
   Params section
───────────────────────────────────────────── */

function ParamsSection({
  label,
  params,
}: {
  label: string;
  params: ApiParam[];
}) {
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

/* ─────────────────────────────────────────────
   Request body section
───────────────────────────────────────────── */

function BodySection({ body }: { body: ApiBody }) {
  return (
    <Section title="Request Body">
      <div className="fw-apiref-body">
        {body.description ? <p className="fw-param-desc">{body.description}</p> : null}
        <p className="fw-apiref-body-ct">
          Content-Type: <code>{body.contentType}</code>
          {body.required ? <RequiredBadge /> : null}
        </p>
        {body.schema ? (
          <div className="fw-param-list">
            <BodyFieldRows schema={body.schema} />
          </div>
        ) : null}
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────
   ApiReferenceView — server component
───────────────────────────────────────────── */

export function ApiReferenceView({
  operation,
  servers,
  baseUrl,
}: {
  operation: ApiOperation;
  servers: OpenApiServer[];
  baseUrl?: string;
}): ReactNode {
  const pathParams = operation.parameters.filter((p) => p.in === 'path');
  const queryParams = operation.parameters.filter((p) => p.in === 'query');
  const headerParams = operation.parameters.filter((p) => p.in === 'header');

  return (
    <div className="fw-apiref">
      {/* ── Endpoint header ── */}
      <div className="fw-apiref-header">
        <div className="fw-apiref-endpoint">
          <MethodPill method={operation.method} />
          <code className="fw-apiref-path">
            {operation.path}
          </code>
          {operation.deprecated ? (
            <span className="fw-apiref-deprecated">deprecated</span>
          ) : null}
        </div>
        <div className="fw-apiref-title-row">
          <h1 className="fw-apiref-title">{operation.summary}</h1>
          {/* "Try it" button — opens the client playground */}
          <ApiPlayground operation={operation} servers={servers} />
        </div>
        {operation.description ? (
          <p className="fw-apiref-desc">{operation.description}</p>
        ) : null}
      </div>

      {/* ── Two-column body ── */}
      <div className="fw-apiref-body-layout">
        {/* Left — docs */}
        <div className="fw-apiref-docs">
          <AuthSection security={operation.security} />
          <ParamsSection label="Path Parameters" params={pathParams} />
          <ParamsSection label="Query Parameters" params={queryParams} />
          <ParamsSection label="Header Parameters" params={headerParams} />
          {operation.requestBody ? (
            <BodySection body={operation.requestBody} />
          ) : null}
          {operation.responses.length > 0 ? (
            <Section title="Responses">
              <div className="fw-response-list">
                {operation.responses.map((r) => (
                  <ResponsePanel key={r.status} response={r} />
                ))}
              </div>
            </Section>
          ) : null}
        </div>

        {/* Right — code samples */}
        <RightRail operation={operation} servers={servers} baseUrl={baseUrl} />
      </div>
    </div>
  );
}
