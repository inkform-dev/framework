/**
 * The top-level per-operation page — adapted from the pre-Scalar renderer's
 * ApiReferenceView (git history: api-reference.tsx, deleted in b2a3188).
 * Differences: field rendering goes through SchemaObject (handles
 * oneOf/anyOf/allOf properly instead of falling back to a type-label
 * string), code samples go through CodeSamples (real @scalar/snippetz
 * multi-language generation instead of a single hand-rolled curl string),
 * and "Try it" is TryItConsole — a 'use client' island, not this
 * (server-rendered) component. The page itself stays SSG; only the console
 * hydrates client-side.
 */

import type { ReactNode } from 'react';
import type { ApiOperation, OpenApiServer } from '../openapi';
import { MethodPill } from './badges';
import { CodeSamples } from './CodeSamples';
import { ParamsSection } from './Parameters';
import { RequestBody } from './RequestBody';
import { ResponseSamples } from './ResponseSamples';
import { Responses } from './Responses';
import { SecuritySchemes } from './SecuritySchemes';
import { Servers } from './Servers';
import { TryItConsole } from './TryIt/TryItConsole';

export async function OperationPage({
  operation,
  servers,
  baseUrl,
}: {
  operation: ApiOperation;
  servers: OpenApiServer[];
  baseUrl?: string;
}): Promise<ReactNode> {
  const pathParams = operation.parameters.filter((p) => p.in === 'path');
  const queryParams = operation.parameters.filter((p) => p.in === 'query');
  const headerParams = operation.parameters.filter((p) => p.in === 'header');

  return (
    <div className="fw-apiref">
      <div className="fw-apiref-header">
        {operation.tag ? <p className="fw-apiref-eyebrow">{operation.tag}</p> : null}
        {operation.deprecated ? <span className="fw-apiref-deprecated">deprecated</span> : null}
        <div className="fw-apiref-title-row">
          <h1 className="fw-apiref-title">{operation.summary}</h1>
        </div>
        {operation.description ? <p className="fw-apiref-desc">{operation.description}</p> : null}

        {/* One bordered row — method, path, and Try It together, matching
            the reference layout (previously three separate pieces: a plain
            .fw-apiref-endpoint row with its own small path badge, and the
            Try It button off in the title row next to the H1). */}
        <div
          className="fw-apiref-endpoint"
          // Lets search results show this operation's real method pill
          // (SearchDialog reads Pagefind's per-result `filters.method`) —
          // distinct from the type:API facet (docs-shell.tsx), which only
          // says "this is an API page," not which method.
          data-pagefind-filter={`method:${operation.method.toUpperCase()}`}
        >
          <MethodPill method={operation.method} />
          {/* data-pagefind-weight boosts exact operationId/path matches (e.g.
              searching "get-pokemon" or "/pokemon/{name}") above pages that
              only mention the same words incidentally in prose. */}
          <code className="fw-apiref-path" data-pagefind-weight="2">
            {operation.path}
          </code>
          <code className="fw-apiref-operation-id" data-pagefind-weight="2">
            {operation.operationId}
          </code>
          <TryItConsole operation={operation} servers={servers} />
        </div>
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

        <div className="fw-apiref-rail-stack">
          <CodeSamples operation={operation} servers={servers} baseUrl={baseUrl} />
          <ResponseSamples responses={operation.responses} />
        </div>
      </div>
    </div>
  );
}
