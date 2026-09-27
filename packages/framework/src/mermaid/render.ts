/**
 * Client-only rendering helpers for <Mermaid>: theme tokens → mermaid
 * themeVariables, and a serialized render queue. `mermaid` is imported
 * dynamically so it lands in its own chunk, fetched only when a diagram on
 * the page is about to scroll into view.
 */

import type { MermaidConfig } from 'mermaid';

type Rgba = [number, number, number, number];

let probeCtx: CanvasRenderingContext2D | null = null;

/**
 * Resolves any CSS color the browser understands (hex, rgb, color-mix(),
 * oklch(), …) to concrete RGBA. mermaid's color math (khroma) only parses
 * hex/rgb/hsl, and the --fw-* tokens are free to use modern color syntax, so
 * the token is painted onto a 1×1 canvas and read back.
 */
function toRgba(el: Element, cssVar: string): Rgba | null {
  const probe = document.createElement('span');
  probe.style.color = `var(${cssVar})`;
  probe.style.display = 'none';
  el.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  if (!computed) return null;

  probeCtx ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!probeCtx) return null;
  probeCtx.clearRect(0, 0, 1, 1);
  probeCtx.fillStyle = computed;
  probeCtx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probeCtx.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

/** `a` blended over `b` at `amount` (0 = all b, 1 = all a), alpha flattened. */
function mix(a: Rgba, b: Rgba, amount: number): Rgba {
  const t = amount * a[3];
  return [0, 1, 2].map((i) => Math.round(a[i] * t + b[i] * (1 - t))).concat(1) as Rgba;
}

function hex([r, g, b]: Rgba): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function hue([r, g, b]: Rgba): number {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const d = max - Math.min(rn, gn, bn);
  if (d === 0) return 220;
  const h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return (h * 60 + 360) % 360;
}

function hsl(h: number, s: number, l: number): Rgba {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255), 1];
}

// Hue offsets from the brand color, ordered so neighbours contrast.
const CATEGORY_OFFSETS = [0, 150, 45, 210, 290, 90, 250, 20, 180, 320, 120, 60];

/**
 * Categorical colors for pies, mindmaps, timelines and friends. Mermaid would
 * derive these from primaryColor, which here is a faint tint, so every slice
 * comes out the same muddy shade; rotate the brand hue instead.
 */
function categorical(primary: Rgba, bg: Rgba, fg: Rgba, dark: boolean): Record<string, string> {
  const base = hue(primary);
  const vars: Record<string, string> = {};
  CATEGORY_OFFSETS.forEach((offset, i) => {
    const solid = hsl((base + offset) % 360, dark ? 0.5 : 0.55, dark ? 0.62 : 0.5);
    vars[`pie${i + 1}`] = hex(solid);
    vars[`cScale${i}`] = hex(mix(solid, bg, dark ? 0.35 : 0.22));
    vars[`cScaleLabel${i}`] = hex(fg);
  });
  return {
    ...vars,
    pieSectionTextColor: dark ? hex(bg) : '#ffffff',
    pieStrokeColor: hex(bg),
    pieOuterStrokeColor: hex(bg),
    pieTitleTextColor: hex(fg),
    pieLegendTextColor: hex(fg),
  };
}

/**
 * mermaid config derived from the --fw-* tokens in scope at `el`, so diagrams
 * follow whichever theme (and light/dark mode) the site is in. Nodes get a
 * faint wash of the brand color; lines and labels use the text tokens.
 */
export function themeConfig(el: Element, dark: boolean): MermaidConfig {
  const read = (name: string, fallback: Rgba): Rgba => toRgba(el, name) ?? fallback;
  const bg = read('--fw-bg', dark ? [11, 15, 23, 1] : [255, 255, 255, 1]);
  const fg = read('--fw-fg', dark ? [230, 234, 242, 1] : [30, 41, 59, 1]);
  const muted = read('--fw-muted', [100, 116, 139, 1]);
  const subtle = mix(read('--fw-bg-subtle', bg), bg, 1);
  const border = mix(read('--fw-border', muted), bg, 1);
  const borderStrong = mix(read('--fw-border-strong', muted), bg, 1);
  const primary = mix(read('--fw-primary', [37, 99, 235, 1]), bg, 1);

  const node = mix(primary, bg, dark ? 0.16 : 0.08);
  const nodeBorder = mix(primary, bg, dark ? 0.55 : 0.45);
  const font = getComputedStyle(el).getPropertyValue('--fw-font').trim() || 'ui-sans-serif, system-ui, sans-serif';

  return {
    theme: 'base',
    darkMode: dark,
    fontFamily: font,
    themeVariables: {
      darkMode: dark,
      fontFamily: font,
      fontSize: '15px',
      background: hex(bg),
      textColor: hex(fg),
      titleColor: hex(fg),
      lineColor: hex(muted),

      primaryColor: hex(node),
      primaryTextColor: hex(fg),
      primaryBorderColor: hex(nodeBorder),
      secondaryColor: hex(subtle),
      secondaryTextColor: hex(fg),
      secondaryBorderColor: hex(borderStrong),
      tertiaryColor: hex(bg),
      tertiaryTextColor: hex(fg),
      tertiaryBorderColor: hex(border),

      mainBkg: hex(node),
      nodeBorder: hex(nodeBorder),
      nodeTextColor: hex(fg),
      clusterBkg: hex(subtle),
      clusterBorder: hex(borderStrong),
      edgeLabelBackground: hex(bg),

      noteBkgColor: hex(subtle),
      noteTextColor: hex(fg),
      noteBorderColor: hex(borderStrong),

      actorBkg: hex(node),
      actorBorder: hex(nodeBorder),
      actorTextColor: hex(fg),
      actorLineColor: hex(muted),
      signalColor: hex(fg),
      signalTextColor: hex(fg),
      labelBoxBkgColor: hex(subtle),
      labelBoxBorderColor: hex(borderStrong),
      labelTextColor: hex(fg),
      loopTextColor: hex(fg),
      activationBkgColor: hex(subtle),
      activationBorderColor: hex(borderStrong),

      ...categorical(primary, bg, fg, dark),
    },
  };
}

export type RenderedDiagram = { svg: string };

// mermaid keeps global state (initialize() is process-wide and render() uses
// a shared scratch element), so concurrent renders with different configs can
// bleed into each other. Every render goes through this chain, one at a time.
let queue: Promise<unknown> = Promise.resolve();

/** Parses then renders `chart` to an SVG string; rejects with mermaid's parse error. */
export function renderDiagram(id: string, chart: string, config: MermaidConfig): Promise<RenderedDiagram> {
  const run = queue.then(async () => {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      ...config,
    });
    await mermaid.parse(chart);
    const { svg } = await mermaid.render(id, chart);
    return { svg };
  });
  queue = run.catch(() => undefined);
  return run;
}
