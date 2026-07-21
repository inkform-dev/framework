'use client';

import * as React from 'react';

export interface ResponseSample {
  status: string;
  ok: boolean;
  html: string;
}

/**
 * Status-code tabs over one highlighted JSON sample at a time — mirrors
 * CodeSamplesPanel's card, tabs instead of a language <select>. Same
 * all-samples-render-just-hidden approach as CodeSamplesPanel — every
 * status's real sample stays in the static HTML, not just whichever tab
 * happened to be active.
 */
export function ResponseSamplesPanel({ samples }: { samples: ResponseSample[] }) {
  const [index, setIndex] = React.useState(0);
  const active = samples[index];
  if (!active) return null;

  return (
    <div className="fw-apiref-sample-block">
      <div className="fw-apiref-response-tabs" role="tablist" aria-label="Response status">
        {samples.map((s, i) => (
          <button
            key={s.status}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={`fw-apiref-response-tab${i === index ? ' fw-apiref-response-tab--active' : ''}${s.ok ? '' : ' fw-apiref-response-tab--err'}`}
            onClick={() => setIndex(i)}
          >
            {s.status}
          </button>
        ))}
      </div>
      {samples.map((s, i) => (
        <div
          key={s.status}
          className="fw-apiref-sample-code"
          hidden={i !== index}
          dangerouslySetInnerHTML={{ __html: s.html }}
        />
      ))}
    </div>
  );
}
