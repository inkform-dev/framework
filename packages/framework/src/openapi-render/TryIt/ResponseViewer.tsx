'use client';

import type { TryItResult } from './request-executor';

function prettyPrint(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export function ResponseViewer({ result, streaming }: { result: TryItResult; streaming: boolean }) {
  const isOk = result.ok && result.status >= 200 && result.status < 300;

  return (
    <div className={`fw-playground-response fw-playground-response--${result.error ? 'error' : 'done'}`}>
      <div className="fw-playground-response-meta">
        {result.error ? (
          <span className="fw-response-status fw-response-status--err">Error</span>
        ) : (
          <span className={`fw-response-status fw-response-status--${isOk ? 'ok' : 'err'}`}>
            {result.status} {result.statusText}
          </span>
        )}
        <span className="fw-playground-timing">
          {streaming ? 'streaming… ' : ''}
          {Math.round(result.durationMs)}ms
        </span>
      </div>

      {result.error ? (
        <pre className="fw-playground-response-body">
          <code>{result.error}</code>
        </pre>
      ) : (
        <>
          {result.headers.length > 0 ? (
            <details className="fw-playground-curl-details">
              <summary className="fw-playground-curl-summary">Headers ({result.headers.length})</summary>
              <pre className="fw-playground-curl">
                <code>{result.headers.map(([k, v]) => `${k}: ${v}`).join('\n')}</code>
              </pre>
            </details>
          ) : null}
          <pre className="fw-playground-response-body">
            <code>{prettyPrint(result.bodyText)}</code>
          </pre>
        </>
      )}
    </div>
  );
}
