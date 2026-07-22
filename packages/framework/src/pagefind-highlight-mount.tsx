'use client';

import * as React from 'react';

/**
 * Mounted once by <DocsShell> on every content page. On load, if the URL
 * carries `?q=` (repeated, one value per word — see search-dialog.tsx), highlights
 * each word within the page's `[data-pagefind-body]` region using Pagefind's
 * own generated pagefind-highlight.js (mark.js under the hood) and scrolls to
 * the first match. This is the Mintlify-style "land on the highlighted
 * result" behavior.
 *
 * Degrades silently (no highlight, no error) if the script is missing — same
 * postbuild-dependent availability as the search dialog itself.
 */
type PagefindHighlightCtor = new (options: {
  highlightParam: string;
  addStyles: boolean;
  markOptions: { className: string; done?: () => void };
}) => unknown;

/**
 * Loads pagefind-highlight.js via a runtime-injected <script type="module">
 * rather than a bundler-visible import() — this is invisible to Turbopack's
 * static analysis (no path for it to try to resolve at build time), which a
 * literal or ignore-commented import() was not: Turbopack still attempted to
 * resolve '/_pagefind/pagefind-highlight.js' as a real module path and
 * failed the build ("Module not found"), even with webpackIgnore/
 * turbopackIgnore comments. The bundled script assigns `window.PagefindHighlight`
 * as a side effect (confirmed by reading the generated output), so reading
 * it off `window` after the script's `load` event is reliable.
 */
function loadPagefindHighlightCtor(): Promise<PagefindHighlightCtor | null> {
  return new Promise((resolve) => {
    const existing = (window as unknown as { PagefindHighlight?: PagefindHighlightCtor }).PagefindHighlight;
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/_pagefind/pagefind-highlight.js';
    script.onload = () => {
      resolve((window as unknown as { PagefindHighlight?: PagefindHighlightCtor }).PagefindHighlight ?? null);
    };
    script.onerror = () => resolve(null); // index/highlight script missing — degrade silently
    document.head.appendChild(script);
  });
}

export function PagefindHighlightMount() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('q')) return;

    let cancelled = false;
    (async () => {
      const PagefindHighlight = await loadPagefindHighlightCtor();
      if (cancelled || !PagefindHighlight) return;
      new PagefindHighlight({
        highlightParam: 'q',
        addStyles: false, // we style .fw-search-highlight ourselves (widgets.css) — Pagefind's default is inline yellow
        markOptions: {
          className: 'fw-search-highlight',
          done: () => {
            const first = document.querySelector('.fw-search-highlight');
            first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          },
        },
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads window.location once on mount by design
  }, []);

  return null;
}
