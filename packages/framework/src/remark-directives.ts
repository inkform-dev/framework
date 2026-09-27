import { visit } from 'unist-util-visit';

const CALLOUT_NAMES = new Set(['info', 'warning', 'error', 'success', 'note', 'tip']);

type DirectiveNode = {
  type: string;
  name?: string;
  children?: unknown[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
};

type Parent = { children: unknown[] };

/**
 * Map `:::info … :::` (remark-directive) onto the <Callout type="info">
 * component, and put inline `:name` back as plain text.
 *
 * remark-directive reads any `:word` in running text as a text directive —
 * "re:Work", "Note:this" — and nothing renders those, so they'd come out as
 * an empty <div> inside a paragraph (lost text and a hydration error).
 */
export function remarkCallouts() {
  return (tree: Parameters<typeof visit>[0]) => {
    visit(tree, (node, index, parent) => {
      const n = node as DirectiveNode;
      if ((n.type === 'containerDirective' || n.type === 'leafDirective') && n.name && CALLOUT_NAMES.has(n.name)) {
        n.data ??= {};
        n.data.hName = 'Callout';
        n.data.hProperties = { type: n.name };
        return;
      }
      if (n.type === 'textDirective' && parent && index !== undefined) {
        const restored = [{ type: 'text', value: `:${n.name ?? ''}` }, ...(n.children ?? [])];
        (parent as unknown as Parent).children.splice(index, 1, ...restored);
        return index + restored.length;
      }
    });
  };
}
