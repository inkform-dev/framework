'use client';

import * as React from 'react';
import { Copy, Check, ChevronDown, FileText } from 'lucide-react';

export interface CopyPageButtonProps {
  /** Raw Markdown for the current page (MDX body for doc pages, a rendered operation for API pages). */
  content: string;
}

/**
 * "Copy page" action next to the page title (the reference site's own
 * affordance) — a NEW component, not part of @inkform/framework. Copies the
 * page's Markdown to the clipboard; the chevron opens a small menu with a
 * "View as Markdown" fallback. Deliberately a first cut: no ChatGPT/Claude/
 * Perplexity deep links or MCP-install shortcuts (the reference site has
 * those; out of scope here — see the task notes on not over-engineering
 * this).
 */
export function CopyPageButton({ content }: CopyPageButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function copyPage() {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (insecure context, denied permission) —
      // "View as Markdown" in the menu is the fallback path.
    }
  }

  function viewAsMarkdown() {
    setOpen(false);
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="fw-copy-page" ref={rootRef}>
      <button type="button" className="fw-copy-page-btn" onClick={() => void copyPage()}>
        {copied ? <Check size={14} strokeWidth={1.75} /> : <Copy size={14} strokeWidth={1.75} />}
        <span>{copied ? 'Copied' : 'Copy page'}</span>
      </button>
      <button
        type="button"
        className="fw-copy-page-chevron"
        aria-label="More copy options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronDown size={14} strokeWidth={1.75} />
      </button>
      {open ? (
        <div className="fw-copy-page-menu" role="menu">
          <button type="button" role="menuitem" className="fw-copy-page-menu-item" onClick={() => void copyPage()}>
            <Copy size={14} strokeWidth={1.75} />
            <span>
              <span className="fw-copy-page-menu-item-title">Copy page</span>
              <span className="fw-copy-page-menu-item-desc">Copy page as Markdown</span>
            </span>
          </button>
          <button type="button" role="menuitem" className="fw-copy-page-menu-item" onClick={viewAsMarkdown}>
            <FileText size={14} strokeWidth={1.75} />
            <span>
              <span className="fw-copy-page-menu-item-title">View as Markdown</span>
              <span className="fw-copy-page-menu-item-desc">Open this page as plain text</span>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
