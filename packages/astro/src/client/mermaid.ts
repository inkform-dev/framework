/**
 * ```mermaid diagrams, drawn in the browser when the `mermaid` option is on.
 * Uses the framework's own renderer (theme tokens → mermaid colors, one
 * render at a time), and @panzoom/panzoom for zoom and pan; mermaid itself
 * loads only once a diagram is about to scroll into view.
 *
 * A smaller cousin of the framework's React viewer: inline pan and zoom
 * (⌘/Ctrl + wheel, double-click, +/−/0 and arrow keys), copy source,
 * download SVG, and a fullscreen view. No minimap.
 */

import Panzoom, { type PanzoomObject } from '@panzoom/panzoom';
import { renderDiagram, themeConfig } from '@inkform/framework/mermaid/render';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS: Record<string, string[]> = {
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  copy: ['M8 8h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z', 'M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4'],
  check: ['M20 6 9 17l-5-5'],
  download: ['M12 3v12', 'm7 10 5 5 5-5', 'M5 21h14'],
  expand: ['M8 3H5a2 2 0 0 0-2 2v3', 'M21 8V5a2 2 0 0 0-2-2h-3', 'M3 16v3a2 2 0 0 0 2 2h3', 'M16 21h3a2 2 0 0 0 2-2v-3'],
  close: ['M18 6 6 18', 'm6 6 12 12'],
};

let renders = 0;

const isDark = () => document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function icon(name: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries({ width: '15', height: '15', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.75', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) {
    svg.setAttribute(k, v);
  }
  for (const d of ICONS[name] ?? []) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

function button(label: string, iconName: string | null, onClick: () => void, className = 'fw-mermaid-btn'): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.setAttribute('aria-label', label);
  b.title = label;
  if (iconName) b.append(icon(iconName));
  b.addEventListener('click', onClick);
  return b;
}

function sep(): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = 'fw-mermaid-sep';
  s.setAttribute('aria-hidden', 'true');
  return s;
}

function slug(text: string | undefined): string {
  return (text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'diagram';
}

function downloadSvg(svg: string, name: string, background: string): void {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  const vb = root.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
  if (vb?.length === 4) {
    root.setAttribute('width', String(vb[2]));
    root.setAttribute('height', String(vb[3]));
  }
  root.setAttribute('style', `background-color: ${background}`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(root)}`;
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface Viewer {
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
  destroy(): void;
}

/** A pan/zoom surface: scale 1 fits the diagram in view. `onScale` reports the zoom level. */
function viewer(frame: HTMLElement, svgMarkup: string, mode: 'inline' | 'fullscreen', onScale: (s: number) => void): Viewer {
  const stage = document.createElement('div');
  stage.className = 'fw-mermaid-stage';
  stage.innerHTML = svgMarkup;
  frame.replaceChildren(stage);
  const svg = stage.querySelector('svg');
  if (!svg) return { zoomIn() {}, zoomOut() {}, reset() {}, destroy() {} };

  const vb = svg.viewBox?.baseVal;
  const natural = vb && vb.width > 0 ? { w: vb.width, h: vb.height } : { w: 400, h: 300 };
  svg.style.maxWidth = 'none';
  const pad = mode === 'inline' ? 16 : 32;
  const fit = () => {
    const availW = Math.max(frame.clientWidth - pad * 2, 1);
    const availH = mode === 'inline' ? Math.min(window.innerHeight * 0.7, 576) - pad * 2 : Math.max(frame.clientHeight - pad * 2, 1);
    const s = Math.min(availW / natural.w, availH / natural.h, mode === 'inline' ? 1 : 2);
    svg.setAttribute('width', String(natural.w * s));
    svg.setAttribute('height', String(natural.h * s));
    if (mode === 'inline') frame.style.height = `${Math.round(natural.h * s + pad * 2)}px`;
  };
  fit();

  const pz: PanzoomObject = Panzoom(stage, {
    canvas: true,
    minScale: 0.5,
    maxScale: 12,
    step: 0.35,
    cursor: 'grab',
    panOnlyWhenZoomed: mode === 'inline',
    touchAction: mode === 'inline' ? 'pan-y' : 'none',
  });
  const animate = !reducedMotion();
  stage.addEventListener('panzoomchange', (e) => onScale((e as CustomEvent<{ scale: number }>).detail.scale));
  const onWheel = (e: WheelEvent) => {
    if (mode === 'fullscreen' || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      pz.zoomWithWheel(e);
    }
  };
  frame.addEventListener('wheel', onWheel, { passive: false });
  frame.addEventListener('dblclick', (e) => pz.zoomToPoint(Math.min(pz.getScale() * 2, 12), e, { animate }));
  frame.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const step = 60 / pz.getScale();
    const actions: Record<string, () => void> = {
      '+': () => pz.zoomIn({ animate }),
      '=': () => pz.zoomIn({ animate }),
      '-': () => pz.zoomOut({ animate }),
      '0': () => pz.reset({ animate }),
      ArrowLeft: () => pz.pan(step, 0, { relative: true, force: true }),
      ArrowRight: () => pz.pan(-step, 0, { relative: true, force: true }),
      ArrowUp: () => pz.pan(0, step, { relative: true, force: true }),
      ArrowDown: () => pz.pan(0, -step, { relative: true, force: true }),
    };
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  });
  const ro = new ResizeObserver(() => {
    fit();
    pz.reset({ animate: false });
  });
  ro.observe(frame);
  onScale(pz.getScale());

  return {
    zoomIn: () => pz.zoomIn({ animate }),
    zoomOut: () => pz.zoomOut({ animate }),
    reset: () => pz.reset({ animate }),
    destroy: () => {
      ro.disconnect();
      frame.removeEventListener('wheel', onWheel);
      pz.destroy();
    },
  };
}

function frameFor(label: string): HTMLDivElement {
  const frame = document.createElement('div');
  frame.className = 'fw-mermaid-frame';
  frame.tabIndex = 0;
  frame.setAttribute('role', 'group');
  frame.setAttribute('aria-roledescription', 'diagram');
  frame.setAttribute('aria-label', label);
  return frame;
}

function toolbar(api: () => Viewer | null, extra: { onCopy: (b: HTMLButtonElement) => void; onDownload: () => void; onExpand?: () => void; onClose?: () => void }) {
  const bar = document.createElement('div');
  bar.className = 'fw-mermaid-toolbar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Diagram controls');
  const zoom = button('Zoom 100%, reset to fit', null, () => api()?.reset(), 'fw-mermaid-btn fw-mermaid-zoom');
  zoom.title = 'Reset to fit';
  zoom.textContent = '100%';
  const copyButton = button('Copy Mermaid source', 'copy', () => extra.onCopy(copyButton));
  bar.append(
    button('Zoom out', 'minus', () => api()?.zoomOut()),
    zoom,
    button('Zoom in', 'plus', () => api()?.zoomIn()),
    sep(),
    copyButton,
    button('Download SVG', 'download', extra.onDownload),
  );
  if (extra.onExpand) bar.append(button('Open fullscreen', 'expand', extra.onExpand));
  if (extra.onClose) bar.append(sep(), button('Close', 'close', extra.onClose));
  const setScale = (s: number) => {
    zoom.textContent = `${Math.round(s * 100)}%`;
    zoom.setAttribute('aria-label', `Zoom ${Math.round(s * 100)}%, reset to fit`);
  };
  return { bar, setScale };
}

async function draw(figure: HTMLElement): Promise<void> {
  const source = figure.dataset.chart ?? '';
  if (!source) return;
  const caption = figure.dataset.caption;
  const label = caption || 'Diagram';
  const placeholder = figure.querySelector('.fw-mermaid-placeholder, .fw-mermaid-body, .fw-mermaid-error');
  const id = `fw-mermaid-${++renders}`;

  let svg: string;
  try {
    ({ svg } = await renderDiagram(id, source, themeConfig(figure, isDark())));
  } catch (err) {
    const box = document.createElement('div');
    box.className = 'fw-mermaid-error';
    box.setAttribute('role', 'alert');
    const title = document.createElement('p');
    title.className = 'fw-mermaid-error-title';
    title.textContent = 'This diagram couldn’t be rendered';
    const message = document.createElement('p');
    message.className = 'fw-mermaid-error-message';
    message.textContent = (err instanceof Error ? err.message : String(err)).replace(/^Error:\s*/, '') || 'Unknown error';
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.className = 'language-mermaid';
    code.textContent = source;
    pre.append(code);
    box.append(title, message, pre);
    placeholder?.replaceWith(box);
    return;
  }

  const copySource = async (b: HTMLButtonElement) => {
    try {
      await navigator.clipboard.writeText(source);
    } catch {
      return;
    }
    b.replaceChildren(icon('check'));
    setTimeout(() => b.replaceChildren(icon('copy')), 1500);
  };
  const download = () => {
    const bg = getComputedStyle(figure).getPropertyValue('--fw-bg').trim() || 'transparent';
    downloadSvg(svg, slug(caption), bg);
  };

  // Inline view.
  const body = document.createElement('div');
  body.className = 'fw-mermaid-body';
  const viewport = document.createElement('div');
  viewport.className = 'fw-mermaid-viewport';
  viewport.dataset.mode = 'inline';
  const frame = frameFor(label);
  viewport.append(frame);
  let inline: Viewer | null = null;
  const inlineBar = toolbar(() => inline, { onCopy: copySource, onDownload: download, onExpand: () => openFullscreen() });
  body.append(viewport, inlineBar.bar);
  placeholder?.replaceWith(body);
  figure.querySelector('dialog.fw-mermaid-dialog')?.remove();
  inline = viewer(frame, svg, 'inline', inlineBar.setScale);

  // Fullscreen view, built when first opened. Its ids must not collide with the inline copy's.
  const openFullscreen = () => {
    const dialog = document.createElement('dialog');
    dialog.className = 'fw-mermaid-dialog';
    dialog.setAttribute('aria-label', label);
    const inner = document.createElement('div');
    inner.className = 'fw-mermaid-dialog-inner';
    const header = document.createElement('header');
    header.className = 'fw-mermaid-dialog-header';
    const title = document.createElement('span');
    title.className = 'fw-mermaid-dialog-title';
    title.textContent = label;
    let full: Viewer | null = null;
    const fullBar = toolbar(() => full, { onCopy: copySource, onDownload: download, onClose: () => dialog.close() });
    header.append(title, fullBar.bar);
    const fullViewport = document.createElement('div');
    fullViewport.className = 'fw-mermaid-viewport';
    fullViewport.dataset.mode = 'fullscreen';
    const fullFrame = frameFor(label);
    fullViewport.append(fullFrame);
    const hint = document.createElement('p');
    hint.className = 'fw-mermaid-dialog-hint';
    hint.textContent = 'Scroll or pinch to zoom · Drag to pan · Double-click to zoom in · Esc to close';
    inner.append(header, fullViewport, hint);
    dialog.append(inner);
    figure.append(dialog);
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    const html = document.documentElement;
    const overflow = html.style.overflow;
    dialog.addEventListener('close', () => {
      full?.destroy();
      dialog.remove();
      html.style.overflow = overflow;
    });
    html.style.overflow = 'hidden';
    dialog.showModal();
    full = viewer(fullFrame, svg.replaceAll(id, `${id}-fs`), 'fullscreen', fullBar.setScale);
  };

  figure.addEventListener('fw:mermaid-retheme', () => inline?.destroy(), { once: true });
}

export function mountMermaid(): void {
  const figures = [...document.querySelectorAll<HTMLElement>('figure[data-fw-mermaid]')];
  if (figures.length === 0) return;
  const drawn = new Set<HTMLElement>();

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const figure = entry.target as HTMLElement;
        io.unobserve(figure);
        drawn.add(figure);
        void draw(figure);
      }
    },
    { rootMargin: '600px 0px' },
  );
  for (const figure of figures) io.observe(figure);

  // Redraw in the other color scheme when the theme toggle flips it.
  let dark = isDark();
  new MutationObserver(() => {
    if (isDark() === dark) return;
    dark = isDark();
    for (const figure of drawn) {
      figure.dispatchEvent(new Event('fw:mermaid-retheme'));
      void draw(figure);
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
}
