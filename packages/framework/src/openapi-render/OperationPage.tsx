/**
 * The top-level per-operation page — adapted from the pre-Scalar renderer's
 * ApiReferenceView (git history: api-reference.tsx, deleted in b2a3188).
 * Differences: field rendering goes through SchemaObject (handles
 * oneOf/anyOf/allOf properly instead of falling back to a type-label
 * string), code samples go through CodeSamples (real @scalar/snippetz
 * multi-language generation instead of a single hand-rolled curl string),
 * and there's no "Try it" button — that's Try-It, a separate later phase
 * (the CSS for its modal already exists in api.css from the old renderer,
 * unused for now).
 */

import type { ReactNode } from 'react';
import type { ApiOperation, OpenApiServer } from '../openapi';
import { MethodPill } from './badges';
import { CodeSamples } from './CodeSamples';
import { ParamsSection } from './Parameters';
import { RequestBody } from './RequestBody';
import { Responses } from './Responses';
import { SecuritySchemes } from './SecuritySchemes';
import { Servers } from './Servers';

export function OperationPage({
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
      <div className="fw-apiref-header">
        <div className="fw-apiref-endpoint">
          <MethodPill method={operation.method} />
          <code className="fw-apiref-path">{operation.path}</code>
          {operation.deprecated ? <span className="fw-apiref-deprecated">deprecated</span> : null}
        </div>
        <div className="fw-apiref-title-row">
          <h1 className="fw-apiref-title">{operation.summary}</h1>
        </div>
        {operation.description ? <p className="fw-apiref-desc">{operation.description}</p> : null}
      </div>

      <div className="fw-apiref-body-layout">
        <div className="fw-apiref-docs">
          <SecuritySchemes security={operation.security} />
          <Servers servers={servers} />
          <ParamsSection label="Path Parameters" params={pathParams} />
          <ParamsSection label="Query Parameters" params={queryParams} />
          <ParamsSection label="Header Parameters" params={headerParams} />
          {operation.requestBody ? <RequestBody body={operation.requestBody} /> : null}
          <Responses responses={operation.responses} />
        </div>

        <CodeSamples operation={operation} servers={servers} baseUrl={baseUrl} />
      </div>
    </div>
  );
}
