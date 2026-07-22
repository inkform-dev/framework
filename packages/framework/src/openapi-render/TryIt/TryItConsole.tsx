'use client';

import * as React from 'react';
import type { ApiOperation, OpenApiServer } from '../../openapi';
import { sampleFromSchema } from '../sample';
import { buildTryItRequest, executeTryItRequest, type TryItResult } from './request-executor';
import { ResponseViewer } from './ResponseViewer';

/**
 * Try-It — a client island mounted on an otherwise-static operation page
 * (see OperationPage.tsx: only this component hydrates, the page itself
 * stays server-rendered/SSG so search/SEO are unaffected). Adapted from
 * this repo's pre-Scalar ApiPlayground (git history: api-playground-
 * client.tsx, deleted in b2a3188 — recovered structure, upgraded onto
 * request-executor.ts for real multi-scheme auth, header params, file
 * upload, and streaming, none of which the old version had).
 */
export function TryItConsole({ operation, servers }: { operation: ApiOperation; servers: OpenApiServer[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" className="fw-apiref-tryit" onClick={() => setOpen(true)}>
        Try it
      </button>
      {open ? <PlaygroundModal operation={operation} servers={servers} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

type SendState = 'idle' | 'loading' | 'streaming' | 'done';

function isFileProperty(schema: unknown): boolean {
  const s = schema as { format?: string } | undefined;
  return s?.format === 'binary' || s?.format === 'byte';
}

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
  const [pathValues, setPathValues] = React.useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = React.useState<Record<string, string>>({});
  const [headerValues, setHeaderValues] = React.useState<Record<string, string>>({});
  const [authValues, setAuthValues] = React.useState<Record<string, string>>({});
  const [bodyText, setBodyText] = React.useState('');
  const [bodyFields, setBodyFields] = React.useState<Record<string, string>>({});
  const [bodyFiles, setBodyFiles] = React.useState<Record<string, File | null>>({});
  const [state, setState] = React.useState<SendState>('idle');
  const [result, setResult] = React.useState<TryItResult | null>(null);

  const pathParams = operation.parameters.filter((p) => p.in === 'path');
  const queryParams = operation.parameters.filter((p) => p.in === 'query');
  const headerParams = operation.parameters.filter((p) => p.in === 'header');
  const isMultipart = operation.requestBody?.contentType === 'multipart/form-data';
  const bodyProperties = isMultipart ? Object.entries(operation.requestBody?.schema?.properties ?? {}) : [];

  React.useEffect(() => {
    if (!isMultipart && operation.requestBody?.schema && bodyText === '') {
      setBodyText(JSON.stringify(sampleFromSchema(operation.requestBody.schema), null, 2));
    }
    // Pre-fill once on mount only — an intentional starting point, not a
    // live sync (the user may have already started editing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function send() {
    setState('loading');
    setResult(null);

    let bodyFormData: FormData | undefined;
    if (isMultipart) {
      bodyFormData = new FormData();
      for (const [name, value] of Object.entries(bodyFields)) {
        if (value !== '') bodyFormData.append(name, value);
      }
      for (const [name, file] of Object.entries(bodyFiles)) {
        if (file) bodyFormData.append(name, file);
      }
    }

    const request = buildTryItRequest({
      operation,
      serverUrl,
      pathValues,
      queryValues,
      headerValues,
      auth: operation.security.map((scheme) => ({ scheme, value: authValues[scheme.key] ?? '' })),
      bodyContentType: operation.requestBody?.contentType,
      bodyText: isMultipart ? undefined : bodyText || undefined,
      bodyFormData,
    });

    const finalResult = await executeTryItRequest(request, (accumulated) => {
      setState('streaming');
      setResult({ ok: true, status: 0, statusText: '', headers: [], bodyText: accumulated, durationMs: 0 });
    });
    setResult(finalResult);
    setState('done');
  }

  return (
    <div className="fw-playground-overlay" role="dialog" aria-modal aria-label="API Playground">
      <div className="fw-playground-backdrop" onClick={onClose} aria-hidden />

      <div className="fw-playground-panel">
        <div className="fw-playground-header">
          <span className="fw-playground-title">
            <span className={`fw-method-pill fw-method-${operation.method}`}>{operation.method.toUpperCase()}</span>
            <code className="fw-playground-path">{operation.path}</code>
          </span>
          <button type="button" className="fw-playground-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="fw-playground-body">
        <div className="fw-playground-form">
          {servers.length > 1 ? (
            <label className="fw-playground-field">
              <span className="fw-playground-label">Server</span>
              <select className="fw-playground-select" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)}>
                {servers.map((s) => (
                  <option key={s.url} value={s.url}>
                    {s.description ? `${s.description} (${s.url})` : s.url}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {operation.security.length > 0 ? (
            <div className="fw-playground-group">
              <p className="fw-playground-group-label">Authorization</p>
              {operation.security.map((scheme) => (
                <label key={scheme.key} className="fw-playground-field">
                  <span className="fw-playground-label">
                    {scheme.key}{' '}
                    <span className="fw-playground-ct">
                      {scheme.type === 'http' ? `http, ${scheme.scheme}` : scheme.type}
                    </span>
                  </span>
                  <input
                    className="fw-playground-input"
                    type={scheme.type === 'http' && scheme.scheme === 'bearer' ? 'password' : 'text'}
                    placeholder={scheme.scheme === 'basic' ? 'username:password' : 'value'}
                    value={authValues[scheme.key] ?? ''}
                    onChange={(e) => setAuthValues((v) => ({ ...v, [scheme.key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          ) : null}

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
                    placeholder={p.example !== undefined ? String(p.example) : (p.description ?? p.name)}
                    value={pathValues[p.name] ?? ''}
                    onChange={(e) => setPathValues((v) => ({ ...v, [p.name]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          ) : null}

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
                    placeholder={p.example !== undefined ? String(p.example) : (p.description ?? p.name)}
                    value={queryValues[p.name] ?? ''}
                    onChange={(e) => setQueryValues((v) => ({ ...v, [p.name]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          ) : null}

          {headerParams.length > 0 ? (
            <div className="fw-playground-group">
              <p className="fw-playground-group-label">Header Parameters</p>
              {headerParams.map((p) => (
                <label key={p.name} className="fw-playground-field">
                  <span className="fw-playground-label">
                    {p.name}
                    {p.required ? <span className="fw-param-required">required</span> : null}
                  </span>
                  <input
                    className="fw-playground-input"
                    type="text"
                    placeholder={p.example !== undefined ? String(p.example) : (p.description ?? p.name)}
                    value={headerValues[p.name] ?? ''}
                    onChange={(e) => setHeaderValues((v) => ({ ...v, [p.name]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          ) : null}

          {operation.requestBody ? (
            <div className="fw-playground-group">
              <p className="fw-playground-group-label">
                Request Body <code className="fw-playground-ct">{operation.requestBody.contentType}</code>
              </p>
              {isMultipart ? (
                bodyProperties.map(([name, propSchema]) => (
                  <label key={name} className="fw-playground-field">
                    <span className="fw-playground-label">{name}</span>
                    {isFileProperty(propSchema) ? (
                      <input
                        className="fw-playground-input"
                        type="file"
                        onChange={(e) => setBodyFiles((v) => ({ ...v, [name]: e.target.files?.[0] ?? null }))}
                      />
                    ) : (
                      <input
                        className="fw-playground-input"
                        type="text"
                        value={bodyFields[name] ?? ''}
                        onChange={(e) => setBodyFields((v) => ({ ...v, [name]: e.target.value }))}
                      />
                    )}
                  </label>
                ))
              ) : (
                <textarea
                  className="fw-playground-textarea"
                  rows={6}
                  placeholder='{ "key": "value" }'
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                />
              )}
            </div>
          ) : null}

          <button type="button" className="fw-playground-send" onClick={send} disabled={state === 'loading' || state === 'streaming'}>
            {state === 'loading' ? 'Sending…' : state === 'streaming' ? 'Receiving…' : 'Send Request'}
          </button>
        </div>

          <div className="fw-playground-result">
            {result ? (
              <ResponseViewer result={result} streaming={state === 'streaming'} />
            ) : (
              <p className="fw-playground-result-placeholder">Send a request to see the response here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
