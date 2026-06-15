'use client';

import * as React from 'react';
import type { ApiOperation, OpenApiServer } from './openapi';
import { curlExample } from './openapi';

/* ─────────────────────────────────────────────
   ApiPlayground — 'use client' modal
───────────────────────────────────────────── */

export function ApiPlayground({
  operation,
  servers,
  onClose,
}: {
  operation: ApiOperation;
  servers: OpenApiServer[];
  onClose?: () => void;
}): React.ReactNode {
  const [open, setOpen] = React.useState(false);

  function close() {
    setOpen(false);
    onClose?.();
  }

  return (
    <>
      <button type="button" className="fw-apiref-tryit" onClick={() => setOpen(true)}>
        Try it
      </button>
      {open ? (
        <PlaygroundModal operation={operation} servers={servers} onClose={close} />
      ) : null}
    </>
  );
}

/* ─────────────────────────────────────────────
   Modal body
───────────────────────────────────────────── */

type SendState = 'idle' | 'loading' | 'done' | 'error';

function PlaygroundModal({
  operation,
  servers,
  onClose,
}: {
  operation: ApiOperation;
  servers: OpenApiServer[];
  onClose: () => void;
}) {
  const [serverUrl, setServerUrl] = React.useState(servers[0]?.url ?? '/');
  const [bearerToken, setBearerToken] = React.useState('');
  const [pathValues, setPathValues] = React.useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = React.useState<Record<string, string>>({});
  const [bodyText, setBodyText] = React.useState('');
  const [state, setState] = React.useState<SendState>('idle');
  const [responseStatus, setResponseStatus] = React.useState<number | null>(null);
  const [responseBody, setResponseBody] = React.useState<string | null>(null);
  const [durationMs, setDurationMs] = React.useState<number | null>(null);

  const pathParams = operation.parameters.filter((p) => p.in === 'path');
  const queryParams = operation.parameters.filter((p) => p.in === 'query');
  const hasAuth = operation.security.length > 0;
  const hasBody = !!operation.requestBody;

  // Close on Escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Build the resolved URL
  function resolvedPath() {
    let p = operation.path;
    for (const [k, v] of Object.entries(pathValues)) {
      p = p.replace(`{${k}}`, encodeURIComponent(v || `:${k}`));
    }
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(queryValues)) {
      if (v) qs.set(k, v);
    }
    const qstr = qs.toString();
    return `${serverUrl.replace(/\/$/, '')}${p}${qstr ? `?${qstr}` : ''}`;
  }

  async function send() {
    setState('loading');
    setResponseBody(null);
    setResponseStatus(null);
    setDurationMs(null);

    const url = resolvedPath();
    const headers: Record<string, string> = {};
    if (hasAuth && bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }
    if (hasBody) {
      headers['Content-Type'] = operation.requestBody?.contentType ?? 'application/json';
    }

    const start = Date.now();
    try {
      const res = await fetch(url, {
        method: operation.method.toUpperCase(),
        headers,
        ...(hasBody && bodyText ? { body: bodyText } : {}),
      });
      const text = await res.text();
      setDurationMs(Date.now() - start);
      setResponseStatus(res.status);
      // Pretty-print if JSON
      try {
        setResponseBody(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponseBody(text);
      }
      setState('done');
    } catch (err) {
      setDurationMs(Date.now() - start);
      setResponseBody(err instanceof Error ? err.message : 'Network error');
      setState('error');
    }
  }

  const curl = curlExample(operation, serverUrl);

  return (
    <div className="fw-playground-overlay" role="dialog" aria-modal aria-label="API Playground">
      {/* Backdrop */}
      <div className="fw-playground-backdrop" onClick={onClose} aria-hidden />

      {/* Panel */}
      <div className="fw-playground-panel">
        {/* Header */}
        <div className="fw-playground-header">
          <span className="fw-playground-title">
            <span className={`fw-method-pill fw-method-${operation.method}`}>
              {operation.method.toUpperCase()}
            </span>
            <code className="fw-playground-path">{operation.path}</code>
          </span>
          <button type="button" className="fw-playground-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="fw-playground-body">
          {/* Server */}
          {servers.length > 1 ? (
            <label className="fw-playground-field">
              <span className="fw-playground-label">Server</span>
              <select
                className="fw-playground-select"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
              >
                {servers.map((s) => (
                  <option key={s.url} value={s.url}>
                    {s.description ? `${s.description} (${s.url})` : s.url}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {/* Auth */}
          {hasAuth ? (
            <label className="fw-playground-field">
              <span className="fw-playground-label">Bearer Token</span>
              <input
                className="fw-playground-input"
                type="password"
                placeholder="Your API token"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
              />
            </label>
          ) : null}

          {/* Path params */}
          {pathParams.length > 0 ? (
            <div className="fw-playground-group">
              <p className="fw-playground-group-label">Path Parameters</p>
              {pathParams.map((p) => (
                <label key={p.name} className="fw-playground-field">
                  <span className="fw-playground-label">
                    {p.name}
                    {p.required ? <span className="fw-param-required">required</span> : null}
                  </span>
                  <input
                    className="fw-playground-input"
                    type="text"
                    placeholder={p.description ?? p.name}
                    value={pathValues[p.name] ?? ''}
                    onChange={(e) =>
                      setPathValues((v) => ({ ...v, [p.name]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
          ) : null}

          {/* Query params */}
          {queryParams.length > 0 ? (
            <div className="fw-playground-group">
              <p className="fw-playground-group-label">Query Parameters</p>
              {queryParams.map((p) => (
                <label key={p.name} className="fw-playground-field">
                  <span className="fw-playground-label">
                    {p.name}
                    {p.required ? <span className="fw-param-required">required</span> : null}
                  </span>
                  <input
                    className="fw-playground-input"
                    type="text"
                    placeholder={p.description ?? p.name}
                    value={queryValues[p.name] ?? ''}
                    onChange={(e) =>
                      setQueryValues((v) => ({ ...v, [p.name]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
          ) : null}

          {/* Request body */}
          {hasBody ? (
            <div className="fw-playground-group">
              <p className="fw-playground-group-label">
                Request Body{' '}
                <code className="fw-playground-ct">
                  {operation.requestBody?.contentType}
                </code>
              </p>
              <textarea
                className="fw-playground-textarea"
                rows={6}
                placeholder='{ "key": "value" }'
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
              />
            </div>
          ) : null}

          {/* cURL preview */}
          <details className="fw-playground-curl-details">
            <summary className="fw-playground-curl-summary">cURL preview</summary>
            <pre className="fw-playground-curl">
              <code>{curl}</code>
            </pre>
          </details>

          {/* Send */}
          <button
            type="button"
            className="fw-playground-send"
            onClick={send}
            disabled={state === 'loading'}
          >
            {state === 'loading' ? 'Sending…' : 'Send Request'}
          </button>

          {/* Response */}
          {(state === 'done' || state === 'error') && (
            <div className={`fw-playground-response fw-playground-response--${state}`}>
              <div className="fw-playground-response-meta">
                {responseStatus !== null ? (
                  <span
                    className={`fw-response-status fw-response-status--${responseStatus >= 200 && responseStatus < 300 ? 'ok' : 'err'}`}
                  >
                    {responseStatus}
                  </span>
                ) : null}
                {durationMs !== null ? (
                  <span className="fw-playground-timing">{durationMs}ms</span>
                ) : null}
              </div>
              <pre className="fw-playground-response-body">
                <code>{responseBody}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
