'use client';

import * as React from 'react';
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom';

export type ViewerMode = 'inline' | 'fullscreen';

/** Imperative controls the toolbar drives. */
export interface ViewerApi {
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
}

interface ViewerProps {
  svg: string;
  mode: ViewerMode;
  label: string;
  apiRef: React.RefObject<ViewerApi | null>;
  onScale: (scale: number) => void;
  minimap?: boolean;
}

const PAD = { inline: 16, fullscreen: 32 };
const MAX_SCALE = 12;
const MINIMAP = { width: 184, height: 132 };
/** Fullscreen never opens with labels smaller than this fraction of mermaid's own size. */
const READABLE = 0.75;

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * One pan/zoom surface around a rendered SVG. The SVG is sized so that
 * scale 1 is "fit": the whole diagram in view (inline: never upscaled past
 * its natural size, capped in height; fullscreen: fills the viewport). Zoom
 * and pan are CSS transforms on the stage via @panzoom/panzoom, so the vector
 * stays crisp at any scale.
 *
 * Inline, a plain wheel scrolls the page (a hint explains Ctrl/⌘ + wheel),
 * and on touch a vertical swipe scrolls the page until the diagram is zoomed.
 * Fullscreen, the wheel always zooms.
 */
export function DiagramViewer({ svg, mode, label, apiRef, onScale, minimap = false }: ViewerProps) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const pzRef = React.useRef<PanzoomObject | null>(null);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const viewRef = React.useRef<HTMLDivElement>(null);
  const [hint, setHint] = React.useState(false);
  const [map, setMap] = React.useState<{ src: string; width: number; height: number } | null>(null);
  const hintId = React.useId();
  // Set by the setup effect; the minimap's handlers call through these.
  const paintMinimapRef = React.useRef<(() => void) | null>(null);
  const centerOnRef = React.useRef<((nx: number, ny: number) => void) | null>(null);

  // Keep the latest callback without re-running the setup effect.
  const onScaleRef = React.useRef(onScale);
  onScaleRef.current = onScale;

  React.useLayoutEffect(() => {
    const frame = frameRef.current;
    const stage = stageRef.current;
    if (!frame || !stage) return;

    stage.innerHTML = svg;
    const svgEl = stage.querySelector('svg');
    if (!svgEl) return;

    const vb = svgEl.viewBox?.baseVal;
    const natural =
      vb && vb.width > 0 && vb.height > 0
        ? { width: vb.width, height: vb.height }
        : { width: svgEl.getBBox().width || 400, height: svgEl.getBBox().height || 300 };
    svgEl.style.maxWidth = 'none';
    svgEl.removeAttribute('height');

    const pad = PAD[mode];
    const animate = !reducedMotion();

    const fit = () => {
      const availW = Math.max(frame.clientWidth - pad * 2, 1);
      const availH =
        mode === 'inline'
          ? Math.min(window.innerHeight * 0.7, 576) - pad * 2
          : Math.max(frame.clientHeight - pad * 2, 1);
      const s = Math.min(availW / natural.width, availH / natural.height, mode === 'inline' ? 1 : 2);
      const w = natural.width * s;
      const h = natural.height * s;
      svgEl.setAttribute('width', String(w));
      svgEl.setAttribute('height', String(h));
      if (mode === 'inline') frame.style.height = `${Math.round(h + pad * 2)}px`;
      return s;
    };
    let fitScale = fit();

    const pz = Panzoom(stage, {
      canvas: true,
      minScale: 0.5,
      maxScale: MAX_SCALE,
      step: 0.35,
      cursor: 'grab',
      panOnlyWhenZoomed: mode === 'inline',
      touchAction: mode === 'inline' ? 'pan-y' : 'none',
    });
    pzRef.current = pz;

    // A wide diagram fitted to a phone screen shrinks its labels to a few
    // pixels. Fullscreen opens zoomed to readable text instead (centered);
    // the fit button still shows the whole thing.
    const openReadable = () => {
      if (mode === 'fullscreen' && fitScale < READABLE) pz.zoom(READABLE / fitScale, { animate: false, force: true });
    };
    openReadable();

    // Minimap: visible region of the stage, in stage-local coordinates. The
    // transform is `scale(s) translate(x, y)` about the stage's center, so a
    // frame point q maps back to stage point (q - offset - o) / s - t + o.
    const visibleRegion = () => {
      const s = pz.getScale();
      const t = pz.getPan();
      const w = stage.offsetWidth;
      const h = stage.offsetHeight;
      const toStage = (q: number, offset: number, o: number, tt: number) => (q - offset - o) / s - tt + o;
      const x0 = toStage(0, stage.offsetLeft, w / 2, t.x) / w;
      const x1 = toStage(frame.clientWidth, stage.offsetLeft, w / 2, t.x) / w;
      const y0 = toStage(0, stage.offsetTop, h / 2, t.y) / h;
      const y1 = toStage(frame.clientHeight, stage.offsetTop, h / 2, t.y) / h;
      const clamp = (v: number) => Math.min(1, Math.max(0, v));
      return { x0: clamp(x0), x1: clamp(x1), y0: clamp(y0), y1: clamp(y1) };
    };

    const paintMinimap = () => {
      const view = viewRef.current;
      const img = mapRef.current?.querySelector('img');
      if (!view || !img) return;
      const r = visibleRegion();
      const mw = img.clientWidth;
      const mh = img.clientHeight;
      view.style.transform = `translate(${r.x0 * mw}px, ${r.y0 * mh}px)`;
      view.style.width = `${(r.x1 - r.x0) * mw}px`;
      view.style.height = `${(r.y1 - r.y0) * mh}px`;
      // Nothing to navigate while the whole diagram is in view.
      const whole = r.x0 <= 0.001 && r.y0 <= 0.001 && r.x1 >= 0.999 && r.y1 >= 0.999;
      mapRef.current?.toggleAttribute('data-idle', whole);
    };

    /** Pans so the stage point at normalized (nx, ny) sits in the frame's center. */
    const centerOn = (nx: number, ny: number) => {
      const s = pz.getScale();
      const w = stage.offsetWidth;
      const h = stage.offsetHeight;
      const tx = (frame.clientWidth / 2 - stage.offsetLeft - w / 2) / s + w / 2 - nx * w;
      const ty = (frame.clientHeight / 2 - stage.offsetTop - h / 2) / s + h / 2 - ny * h;
      pz.pan(tx, ty, { animate: false, force: true });
    };

    const onChange = (e: Event) => {
      const { scale } = (e as CustomEvent<{ scale: number }>).detail;
      onScaleRef.current(scale);
      // Inline on touch: let vertical swipes scroll the page until the reader
      // has zoomed in; after that, one-finger drags pan the diagram.
      if (mode === 'inline') {
        const action = scale > 1.001 ? 'none' : 'pan-y';
        frame.style.touchAction = action;
        stage.style.touchAction = action;
      }
      paintMinimap();
    };
    stage.addEventListener('panzoomchange', onChange);

    let hintTimer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      if (mode === 'fullscreen' || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        pz.zoomWithWheel(e);
        return;
      }
      setHint(true);
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => setHint(false), 1400);
    };
    frame.addEventListener('wheel', onWheel, { passive: false });

    const onDblClick = (e: MouseEvent) => {
      const next = Math.min(pz.getScale() * 2, MAX_SCALE);
      pz.zoomToPoint(next, e, { animate });
    };
    frame.addEventListener('dblclick', onDblClick);

    // Refit when the frame's box changes (window resize, sidebar toggle, …).
    let lastW = frame.clientWidth;
    let lastH = frame.clientHeight;
    const ro = new ResizeObserver(() => {
      const w = frame.clientWidth;
      const h = frame.clientHeight;
      const changed = mode === 'inline' ? w !== lastW : w !== lastW || h !== lastH;
      lastW = w;
      if (!changed) return;
      fitScale = fit();
      lastH = frame.clientHeight;
      pz.reset({ animate: false });
      openReadable();
      paintMinimap();
    });
    ro.observe(frame);

    if (minimap) {
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
      const k = Math.min(MINIMAP.width / natural.width, MINIMAP.height / natural.height);
      setMap({ src, width: Math.round(natural.width * k), height: Math.round(natural.height * k) });
    }

    apiRef.current = {
      zoomIn: () => pz.zoomIn({ animate }),
      zoomOut: () => pz.zoomOut({ animate }),
      reset: () => pz.reset({ animate }),
    };
    paintMinimapRef.current = paintMinimap;
    centerOnRef.current = centerOn;
    onScaleRef.current(pz.getScale());
    requestAnimationFrame(paintMinimap);

    return () => {
      clearTimeout(hintTimer);
      ro.disconnect();
      frame.removeEventListener('wheel', onWheel);
      frame.removeEventListener('dblclick', onDblClick);
      stage.removeEventListener('panzoomchange', onChange);
      pz.destroy();
      pzRef.current = null;
      apiRef.current = null;
      paintMinimapRef.current = null;
      centerOnRef.current = null;
    };
  }, [svg, mode, minimap, apiRef]);

  // Paint the viewport rectangle once the minimap image has laid out.
  React.useEffect(() => {
    if (map) paintMinimapRef.current?.();
  }, [map]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const pz = pzRef.current;
    if (!pz) return;
    const step = 60 / pz.getScale();
    const animate = !reducedMotion();
    const actions: Record<string, () => void> = {
      '+': () => pz.zoomIn({ animate }),
      '=': () => pz.zoomIn({ animate }),
      '-': () => pz.zoomOut({ animate }),
      '_': () => pz.zoomOut({ animate }),
      '0': () => pz.reset({ animate }),
      ArrowLeft: () => pz.pan(step, 0, { relative: true, force: true }),
      ArrowRight: () => pz.pan(-step, 0, { relative: true, force: true }),
      ArrowUp: () => pz.pan(0, step, { relative: true, force: true }),
      ArrowDown: () => pz.pan(0, -step, { relative: true, force: true }),
    };
    const action = actions[e.key];
    if (!action || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    action();
  };

  const onMapPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointermove' && !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    if (e.type === 'pointerdown') e.currentTarget.setPointerCapture(e.pointerId);
    const img = e.currentTarget.querySelector('img');
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    centerOnRef.current?.(nx, ny);
  };

  return (
    <div className="fw-mermaid-viewport" data-mode={mode}>
      <div
        ref={frameRef}
        className="fw-mermaid-frame"
        tabIndex={0}
        role="group"
        aria-roledescription="diagram"
        aria-label={label}
        aria-describedby={hintId}
        onKeyDown={onKeyDown}
      >
        <div ref={stageRef} className="fw-mermaid-stage" />
      </div>
      <span id={hintId} className="fw-mermaid-sr">
        Plus and minus keys zoom, arrow keys pan, zero resets.
      </span>
      {mode === 'inline' && (
        <div className="fw-mermaid-wheel-hint" data-show={hint || undefined} aria-hidden="true">
          Hold {isMac() ? '⌘' : 'Ctrl'} and scroll to zoom
        </div>
      )}
      {minimap && map && (
        <div
          ref={mapRef}
          className="fw-mermaid-minimap"
          style={{ width: map.width, height: map.height }}
          onPointerDown={onMapPointer}
          onPointerMove={onMapPointer}
          aria-hidden="true"
        >
          <div className="fw-mermaid-minimap-clip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={map.src} alt="" width={map.width} height={map.height} draggable={false} />
            <div ref={viewRef} className="fw-mermaid-minimap-view" />
          </div>
        </div>
      )}
    </div>
  );
}
