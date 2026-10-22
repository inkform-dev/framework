/**
 * Post-processing for HTML the React kit rendered: one parse, two fixes.
 *
 * 1. Inline styles move into a stylesheet. The framework's components and
 *    Shiki write a few `style="…"` attributes (token colors as
 *    `--shiki-light`/`--shiki-dark`, a card grid's column count). A
 *    Content-Security-Policy without `'unsafe-inline'` for style attributes,
 *    which is what Astro's `security.csp` sends by default, blocks every one
 *    of them: code loses its colors. Each distinct style becomes a class
 *    here; the page prints the rules in one `<style>` element and registers
 *    its hash with Astro's CSP. The rules are `!important`, so they keep the
 *    precedence an inline style had.
 *
 * 2. Site-root links to docs pages gain the docs base (and, when Astro has a
 *    `base`, site-root images gain it). Content written for a
 *    Next.js theme (docs at `/`) links `/quickstart`; under `/docs` that has
 *    to be `/docs/quickstart`. Only links whose path is a page of this docs
 *    site change, so links to the host's own pages and assets are left alone.
 */

import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import type { Element, Root } from 'hast';
import { SKIP, visit } from 'unist-util-visit';

/** Splits `a: b; c: url(x;y)` on top-level semicolons only. */
export function splitDeclarations(style: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  for (const ch of style) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1);
    } else if (ch === ';' && depth === 0) {
      if (current.trim()) out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function important(declaration: string): string {
  return /!\s*important\s*$/i.test(declaration) ? declaration : `${declaration} !important`;
}

/** FNV-1a, base 36: short, stable class names for a given style. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Rewrites a link's href, or returns null to leave it as it is. */
export type HrefRewriter = (href: string) => string | null;

/**
 * Collects rules across the HTML fragments of one page, so a style used in
 * both the article and the API samples becomes one class.
 */
export class InlineStyleSheet {
  private readonly classes = new Map<string, string>(); // declarations → class
  private readonly rules = new Map<string, string>(); // class → declarations

  constructor(private readonly prefix = 'fw-s-') {}

  private classFor(declarations: string): string {
    const known = this.classes.get(declarations);
    if (known) return known;
    const base = `${this.prefix}${hash(declarations)}`;
    let name = base;
    for (let n = 2; this.rules.has(name); n++) name = `${base}-${n}`;
    this.classes.set(declarations, name);
    this.rules.set(name, declarations);
    return name;
  }

  /**
   * Returns `html` with every style attribute replaced by a class, link
   * `href`s passed through `rewrite.href` and image `src`s through
   * `rewrite.src`, when given.
   */
  extract(html: string, rewrite: { href?: HrefRewriter; src?: HrefRewriter } = {}): string {
    const tree = fromHtml(html, { fragment: true }) as Root;
    let changed = false;
    visit(tree, 'element', (node: Element, index, parent) => {
      const props = node.properties ?? {};
      // React 19 writes <link rel="preload"> hints for images where it renders
      // them; in a body fragment they only duplicate the <img> request.
      if (node.tagName === 'link' && parent && index !== undefined && String(props.rel ?? '').includes('preload')) {
        parent.children.splice(index, 1);
        changed = true;
        return [SKIP, index];
      }
      const attr = node.tagName === 'a' ? 'href' : node.tagName === 'img' ? 'src' : null;
      const rewriter = attr === 'href' ? rewrite.href : attr === 'src' ? rewrite.src : undefined;
      const value = attr ? props[attr] : undefined;
      if (attr && rewriter && typeof value === 'string') {
        const next = rewriter(value);
        if (next !== null && next !== value) {
          props[attr] = next;
          changed = true;
        }
      }
      const style = props.style;
      if (typeof style !== 'string') return;
      delete props.style;
      changed = true;
      const declarations = splitDeclarations(style).map(important).join(';');
      if (!declarations) return;
      const existing = props.className;
      const list = Array.isArray(existing) ? existing.map(String) : existing ? [String(existing)] : [];
      props.className = [...list, this.classFor(declarations)];
    });
    return changed ? toHtml(tree) : html;
  }

  get css(): string {
    return [...this.rules].map(([name, declarations]) => `.${name}{${declarations}}`).join('\n');
  }
}

/**
 * Puts Astro's `base` in front of a site-root asset path (`/hero.svg` →
 * `/sub/hero.svg`), since Astro serves `public/` under it. Paths already
 * under the base, protocol-relative and absolute URLs are left alone.
 */
export function assetRewriter(siteBase: string): HrefRewriter {
  return (src) => {
    if (!siteBase || !src.startsWith('/') || src.startsWith('//')) return null;
    if (src === siteBase || src.startsWith(`${siteBase}/`)) return null;
    return `${siteBase}${src}`;
  };
}

/**
 * A rewriter for site-root links to pages of this docs site: `/quickstart#x`
 * → `link('quickstart') + '#x'` when `quickstart` is one of `paths`. The
 * docs home (`/`) is left alone, since on a host site it means the host's home.
 */
export function docsLinkRewriter(paths: ReadonlySet<string>, link: (path: string) => string): HrefRewriter {
  return (href) => {
    if (!href.startsWith('/') || href.startsWith('//')) return null;
    const cut = href.search(/[?#]/);
    const pathname = cut === -1 ? href : href.slice(0, cut);
    const suffix = cut === -1 ? '' : href.slice(cut);
    const path = pathname.replace(/^\/+|\/+$/g, '');
    if (!path || !paths.has(path)) return null;
    return link(path) + suffix;
  };
}
