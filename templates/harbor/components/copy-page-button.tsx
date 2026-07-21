'use client';

import * as React from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * "Copy page" button — copies the current page's raw Markdown source to the
 * clipboard (e.g. to paste into an LLM chat), matching almond.mintlify.site's
 * button next to its page H1. Rendered as a floated preceding sibling of the
 * page content (see app/[[...slug]]/page.tsx + theme.css's
 * `.fw-harbor-page-head` — float:right lets the H1's own line box wrap
 * around it without needing to know the H1's rendered height up front).
 *
 * Generic by design — takes the already-resolved Markdown string, not a
 * page/slug, so it works for both MDX doc pages (raw MDX source) and, if a
 * future page wires it up, an OpenAPI operation's rendered Markdown
 * (`renderOperationMarkdown`) — same shape either way.
 */
export function CopyPageButton({ content }: { content: string }) {
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (no HTTPS/localhost origin, denied
      // permission) — fail quietly rather than showing a broken state.
    }
  }

  return (
    <button
      type="button"
      className="fw-harbor-copy-page"
      onClick={handleCopy}
      data-copied={copied ? 'true' : undefined}
      aria-label="Copy page as Markdown"
    >
      {copied ? <Check size={14} strokeWidth={1.75} /> : <Copy size={14} strokeWidth={1.75} />}
      {copied ? 'Copied' : 'Copy page'}
    </button>
  );
}
