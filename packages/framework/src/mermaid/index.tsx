'use client';

/**
 * @inkform/framework/mermaid — the interactive diagram renderer.
 *
 * Opt-in: needs the `mermaid` package installed alongside the framework
 * (`npm i mermaid`), then register it so ```mermaid fences use it instead of
 * the built-in static source block:
 *
 *   import { mdxComponents } from '@inkform/framework/components';
 *   import { Mermaid } from '@inkform/framework/mermaid';
 *   export const siteMdxComponents = mdxComponents({ Mermaid });
 *
 * Readers only pay for mermaid on pages that have a diagram, and only once
 * the diagram is about to scroll into view — it's a dynamic import.
 */

import * as React from 'react';
import { copyText } from '../clipboard';
import { CheckGlyph, CloseGlyph, CopyGlyph, DownloadGlyph, ExpandGlyph, FitGlyph, MinusGlyph, PlusGlyph } from '../glyphs';
import { renderDiagram, themeConfig } from './render';
import type { ViewerApi } from './viewer';

// The pan/zoom viewer (and @panzoom/panzoom) is its own chunk too, so a site
// that registers <Mermaid> everywhere adds almost nothing to pages without
// a diagram.
const loadViewer = () => import('./viewer');
const DiagramViewer = React.lazy(() => loadViewer().then((m) => ({ default: m.DiagramViewer })));

export interface MermaidProps {
  /** Mermaid source. ```mermaid fences are passed in as this prop. */
  chart?: string;
  /** Shown under the diagram and used as its accessible name. */
  caption?: string;
}

/* ---------------------------------------------------------------------------
 * Hooks
 * -------------------------------------------------------------------------*/

function subscribeTheme(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  return () => mo.disconnect();
}

const isDark = () => {
  const html = document.documentElement;
  return html.classList.contains('dark') || html.dataset.theme === 'dark';
};

/** Tracks the `html.dark` class (or `data-theme="dark"`) the theme toggle sets. */
function useDarkMode() {
  return React.useSyncExternalStore(subscribeTheme, isDark, () => false);
}

/** True once `ref` comes within ~one screen of the viewport. Never flips back. */
function useNearViewport(ref: React.RefObject<Element | null>) {
  const [near, setNear] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, near]);
  return near;
}

/* ---------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------*/

let renderCount = 0;

function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/^Error:\s*/, '').trim() || 'Unknown error';
}

function slugify(text: string | undefined): string {
  const slug = (text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'diagram';
}

/** Standalone SVG file: natural size, page background baked in. */
function downloadSvg(svg: string, name: string, background: string) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  const vb = root.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
  if (vb?.length === 4) {
    root.setAttribute('width', String(vb[2]));
    root.setAttribute('height', String(vb[3]));
  }
  root.removeAttribute('style');
  root.setAttribute('style', `background-color: ${background}`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(root)}`;
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------------------------------------------------------------------
 * Toolbar
 * -------------------------------------------------------------------------*/

interface ToolbarProps {
  scale: number;
  api: React.RefObject<ViewerApi | null>;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onExpand?: () => void;
  onClose?: () => void;
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="fw-mermaid-btn" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

function Toolbar({ scale, api, copied, onCopy, onDownload, onExpand, onClose }: ToolbarProps) {
  return (
    <div className="fw-mermaid-toolbar" role="toolbar" aria-label="Diagram controls">
      <ToolButton label="Zoom out" onClick={() => api.current?.zoomOut()}>
        <MinusGlyph />
      </ToolButton>
      <button
        type="button"
        className="fw-mermaid-btn fw-mermaid-zoom"
        aria-label={`Zoom ${Math.round(scale * 100)}%, reset to fit`}
        title="Reset to fit"
        onClick={() => api.current?.reset()}
      >
        {Math.round(scale * 100)}%
      </button>
      <ToolButton label="Zoom in" onClick={() => api.current?.zoomIn()}>
        <PlusGlyph />
      </ToolButton>
      {onClose && (
        <ToolButton label="Fit to screen" onClick={() => api.current?.reset()}>
          <FitGlyph />
        </ToolButton>
      )}
      <span className="fw-mermaid-sep" aria-hidden="true" />
      <ToolButton label={copied ? 'Copied' : 'Copy Mermaid source'} onClick={onCopy}>
        {copied ? <CheckGlyph /> : <CopyGlyph />}
      </ToolButton>
      <ToolButton label="Download SVG" onClick={onDownload}>
        <DownloadGlyph />
      </ToolButton>
      {onExpand && (
        <ToolButton label="Open fullscreen" onClick={onExpand}>
          <ExpandGlyph />
        </ToolButton>
      )}
      {onClose && (
        <>
          <span className="fw-mermaid-sep" aria-hidden="true" />
          <ToolButton label="Close" onClick={onClose}>
            <CloseGlyph />
          </ToolButton>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Mermaid
 * -------------------------------------------------------------------------*/

type Rendered = { svg: string; id: string } | { error: string } | null;

/**
 * Interactive Mermaid diagram: themed from the site's --fw-* tokens (and
 * re-rendered when light/dark flips), pan + zoom inline, a fullscreen view
 * with a minimap, copy-source and SVG download. Invalid source shows the
 * parse error next to the source instead of an empty box.
 */
export function Mermaid({ chart = '', caption }: MermaidProps) {
  const source = chart.trim();
  const label = caption ?? 'Diagram';
  const figureRef = React.useRef<HTMLElement>(null);
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const inlineApi = React.useRef<ViewerApi | null>(null);
  const fullApi = React.useRef<ViewerApi | null>(null);
  const near = useNearViewport(figureRef);
  const dark = useDarkMode();
  const [rendered, setRendered] = React.useState<Rendered>(null);
  const [scale, setScale] = React.useState(1);
  const [fullScale, setFullScale] = React.useState(1);
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const el = figureRef.current;
    if (!near || !source || !el) return;
    let cancelled = false;
    // A fresh id per render: mermaid removes any existing element with the id
    // it's given, which would yank the diagram on screen during a re-theme.
    const id = `fw-mermaid-${++renderCount}`;
    void loadViewer();
    renderDiagram(id, source, themeConfig(el, dark))
      .then(({ svg }) => !cancelled && setRendered({ svg, id }))
      .catch((err) => !cancelled && setRendered({ error: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [near, source, dark]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    dialog.showModal();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, [open]);

  const onCopy = async () => {
    if (await copyText(source)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const svg = rendered && 'svg' in rendered ? rendered : null;
  const onDownload = () => {
    if (!svg || !figureRef.current) return;
    const bg = getComputedStyle(figureRef.current).getPropertyValue('--fw-bg').trim() || 'transparent';
    downloadSvg(svg.svg, slugify(caption), bg);
  };

  // The fullscreen copy lives in the same document, so its ids (markers,
  // scoped <style>) must not collide with the inline one.
  const fullSvg = React.useMemo(() => (svg ? svg.svg.replaceAll(svg.id, `${svg.id}-fs`) : ''), [svg]);

  let body: React.ReactNode;
  if (!source) {
    body = null;
  } else if (rendered && 'error' in rendered) {
    body = (
      <div className="fw-mermaid-error" role="alert">
        <p className="fw-mermaid-error-title">This diagram couldn&apos;t be rendered</p>
        <p className="fw-mermaid-error-message">{rendered.error}</p>
        <pre>
          <code className="language-mermaid">{source}</code>
        </pre>
      </div>
    );
  } else if (svg) {
    body = (
      <div className="fw-mermaid-body">
        <React.Suspense fallback={<div className="fw-mermaid-placeholder" />}>
          <DiagramViewer svg={svg.svg} mode="inline" label={label} apiRef={inlineApi} onScale={setScale} />
        </React.Suspense>
        <Toolbar
          scale={scale}
          api={inlineApi}
          copied={copied}
          onCopy={onCopy}
          onDownload={onDownload}
          onExpand={() => setOpen(true)}
        />
      </div>
    );
  } else {
    body = (
      <div className="fw-mermaid-placeholder" aria-busy="true" aria-label={`${label} (loading)`}>
        <noscript>
          <pre>
            <code className="language-mermaid">{source}</code>
          </pre>
        </noscript>
      </div>
    );
  }

  return (
    <figure ref={figureRef} className="fw-mermaid">
      {body}
      {caption && <figcaption className="fw-mermaid-caption">{caption}</figcaption>}
      <dialog
        ref={dialogRef}
        className="fw-mermaid-dialog"
        aria-label={label}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      >
        {open && svg && (
          <div className="fw-mermaid-dialog-inner">
            <header className="fw-mermaid-dialog-header">
              <span className="fw-mermaid-dialog-title">{label}</span>
              <Toolbar
                scale={fullScale}
                api={fullApi}
                copied={copied}
                onCopy={onCopy}
                onDownload={onDownload}
                onClose={() => dialogRef.current?.close()}
              />
            </header>
            <React.Suspense fallback={null}>
              <DiagramViewer svg={fullSvg} mode="fullscreen" label={label} apiRef={fullApi} onScale={setFullScale} minimap />
            </React.Suspense>
            <p className="fw-mermaid-dialog-hint">Scroll or pinch to zoom · Drag to pan · Double-click to zoom in · Esc to close</p>
          </div>
        )}
      </dialog>
    </figure>
  );
}

export default Mermaid;
