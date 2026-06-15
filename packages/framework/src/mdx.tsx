import * as React from 'react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import { visit } from 'unist-util-visit';
import { mdxComponents } from './components';

const CALLOUT_NAMES = new Set(['info', 'warning', 'error', 'success', 'note', 'tip']);

type DirectiveNode = {
  type: string;
  name?: string;
  data?: { hName?: string; hProperties?: Record<string, unknown> };
};

/** Map `:::info … :::` (remark-directive) onto the <Callout type="info"> component. */
function remarkCallouts() {
  return (tree: Parameters<typeof visit>[0]) => {
    visit(tree, (node) => {
      const n = node as DirectiveNode;
      if ((n.type === 'containerDirective' || n.type === 'leafDirective') && n.name && CALLOUT_NAMES.has(n.name)) {
        n.data ??= {};
        n.data.hName = 'Callout';
        n.data.hProperties = { type: n.name };
      }
    });
  };
}

const prettyCodeOptions = {
  theme: { light: 'github-light', dark: 'github-dark' },
  keepBackground: false,
};

type MdxProps = {
  source: string;
  /** Register custom widget implementations referenced in the MDX. */
  components?: Record<string, React.ComponentType<Record<string, unknown>>>;
};

/**
 * Renders an MDX string (the body the editor commits) to React. Supports GFM,
 * `:::callout` directives, fenced code with Shiki highlighting, rehype-slug for
 * heading IDs (matching extractHeadings slugs → TOC anchor links), and all
 * built-in components. Unknown components render a visible fallback (never crash
 * the build).
 */
export async function Mdx({ source, components }: MdxProps) {
  return (
    <div className="fw-prose">
      <MDXRemote
        source={source}
        components={mdxComponents(components)}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm, remarkDirective, remarkCallouts],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rehypePlugins: [rehypeSlug, [rehypePrettyCode as any, prettyCodeOptions]],
          },
        }}
      />
    </div>
  );
}
