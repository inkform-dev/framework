/**
 * The on-this-page list, read from the rendered HTML rather than the MDX
 * source: the ids are the ones rehype-slug actually wrote (including its
 * `-1` suffixes for repeated headings), so every TOC link lands.
 */

import { fromHtml } from 'hast-util-from-html';
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
