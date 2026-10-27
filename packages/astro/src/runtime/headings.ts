/**
 * The on-this-page list, read from the rendered HTML rather than the MDX
 * source: the ids are the ones rehype-slug actually wrote (including its
 * `-1` suffixes for repeated headings), so every TOC link lands.
 */

import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import type { Element, ElementContent, Root } from 'hast';
import { visit } from 'unist-util-visit';

export interface TocHeading {
  depth: number;
  text: string;
  slug: string;
}

function textOf(nodes: ElementContent[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text') out += node.value;
    else if (node.type === 'element') out += textOf(node.children);
  }
  return out;
}

/** `h2`/`h3` (by default) headings that have an id, in document order. */
export function headingsFromHtml(html: string, minDepth = 2, maxDepth = 3): TocHeading[] {
  const tree = fromHtml(html, { fragment: true }) as Root;
  const out: TocHeading[] = [];
  visit(tree, 'element', (node: Element) => {
    const match = /^h([1-6])$/.exec(node.tagName);
    if (!match) return;
    const depth = Number(match[1]);
    const id = node.properties?.id;
    if (depth < minDepth || depth > maxDepth || typeof id !== 'string' || !id) return;
    const text = textOf(node.children).replace(/\s+/g, ' ').trim();
    if (text) out.push({ depth, text, slug: id });
  });
  return out;
}

/** Attributes that point at an id: a space-separated list of ids. */
const ID_LISTS = ['ariaDescribedBy', 'ariaLabelledBy'] as const;

/**
 * Puts `prefix-` in front of the heading ids (and GFM footnote ids) in one
 * rendered fragment, and in the links and ARIA references that point at
 * them. For pages that render several MDX bodies, like the changelog: each
 * body gets its ids from rehype-slug on its own, so two entries with an
 * "Added" section would both have `id="added"`.
 */
export function scopeIds(html: string, prefix: string): string {
  const tree = fromHtml(html, { fragment: true }) as Root;
  const renamed = new Map<string, string>();
  visit(tree, 'element', (node: Element) => {
    const id = node.properties?.id;
    if (typeof id !== 'string' || !id) return;
    if (/^h[1-6]$/.test(node.tagName) || id.startsWith('user-content-')) renamed.set(id, `${prefix}-${id}`);
  });
  if (renamed.size === 0) return html;
  visit(tree, 'element', (node: Element) => {
    const props = node.properties ?? {};
    if (typeof props.id === 'string' && renamed.has(props.id)) props.id = renamed.get(props.id);
    if (typeof props.href === 'string' && props.href.startsWith('#')) {
      const target = renamed.get(decodeURIComponent(props.href.slice(1)));
      if (target) props.href = `#${target}`;
    }
    for (const attr of ID_LISTS) {
      // hast parses these space-separated attributes into arrays.
      const value: unknown = props[attr];
      if (Array.isArray(value)) props[attr] = value.map((v) => renamed.get(String(v)) ?? String(v));
    }
  });
  return toHtml(tree);
}
