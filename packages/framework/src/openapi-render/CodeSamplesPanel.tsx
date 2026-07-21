'use client';

import * as React from 'react';

export interface CodeSample {
  label: string;
  lang: string;
  /** Raw, unhighlighted source — what "Copy" actually copies. */
  code: string;
  /** shiki-highlighted HTML — what's actually displayed. */
  html: string;
}

/**
 * One card, one visible sample at a time, switched via a <select> — matches
 * the reference layout (a single "cURL ▾" panel, not four stacked always-
 * visible blocks). All samples render into the DOM simultaneously (only
 * `hidden` toggles) rather than conditionally mounting just the selected
 * one — this is a 'use client' island, but the page around it is still
 * SSG; mounting only the active sample would mean the other 3 languages'
 * code exists nowhere in the static HTML at all (invisible to Pagefind, to
 * no-JS clients, to view-source) purely as a side effect of how the
 * switcher is implemented, not anything the reference design calls for.
 * `html` is shiki output generated server-side in CodeSamples.tsx (trusted,
 * not user input) — dangerouslySetInnerHTML is the only way to render
 * pre-highlighted markup without re-parsing it client-side.
 */
export function CodeSamplesPanel({ samples }: { samples: CodeSample[] }) {
  const [index, setIndex] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const active = samples[index];
  if (!active) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — not fatal, just no visual confirmation
    }
  }

  return (
    <div className="fw-apiref-sample-block">
      <div className="fw-apiref-sample-header">
        <select
          className="fw-apiref-sample-select"
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          aria-label="Code sample language"
        >
          {samples.map((s, i) => (
            <option key={s.lang} value={i}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="button" className="fw-apiref-sample-copy" onClick={() => void handleCopy()} aria-label="Copy code">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {samples.map((s, i) => (
        <div
          key={s.lang}
          className="fw-apiref-sample-code"
          hidden={i !== index}
          dangerouslySetInnerHTML={{ __html: s.html }}
        />
      ))}
    </div>
  );
}
