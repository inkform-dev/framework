import { visit } from 'unist-util-visit';

type CodeNode = {
  type: 'code';
  lang?: string | null;
  meta?: string | null;
  value: string;
};

type JsxAttribute = { type: 'mdxJsxAttribute'; name: string; value: string };

type Parent = { children: unknown[] };

/**
 * Pulls a caption out of a fence's meta string: ```mermaid title="Hiring flow"
 * (or `caption="…"`). Returns undefined when neither is present.
 */
function metaCaption(meta: string | null | undefined): string | undefined {
  if (!meta) return undefined;
  const m = meta.match(/(?:title|caption)=(?:"([^"]*)"|'([^']*)')/);
  return m ? (m[1] ?? m[2]) : undefined;
}

/**
 * Turns ```mermaid fences into `<Mermaid chart="…" />` — the same mdast node an
 * author gets by writing the JSX by hand, so both syntaxes resolve through the
 * component map identically. Runs before rehype-pretty-code ever sees the
 * block, so diagrams are never syntax-highlighted as code.
 *
 * Which `Mermaid` renders is the site's choice: the built-in one shows the
 * source as a static block; `@inkform/framework/mermaid` is the interactive
 * renderer (opt-in, needs the `mermaid` package).
 */
export function remarkMermaid() {
  return (tree: Parameters<typeof visit>[0]) => {
    visit(tree, 'code', (node, index, parent) => {
      const code = node as unknown as CodeNode;
      if (code.lang !== 'mermaid' || !parent || index === undefined) return;

      const attributes: JsxAttribute[] = [{ type: 'mdxJsxAttribute', name: 'chart', value: code.value }];
      const caption = metaCaption(code.meta);
      if (caption) attributes.push({ type: 'mdxJsxAttribute', name: 'caption', value: caption });

      (parent as unknown as Parent).children[index] = {
        type: 'mdxJsxFlowElement',
        name: 'Mermaid',
        attributes,
        children: [],
      };
    });
  };
}
