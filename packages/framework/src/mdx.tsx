import * as React from 'react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import { mdxComponents } from './components';
import { remarkCallouts } from './remark-directives';
import { remarkMermaid } from './remark-mermaid';

export { remarkMermaid } from './remark-mermaid';

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
 * `:::callout` directives, fenced code with Shiki highlighting, ```mermaid
 * fences as <Mermaid> diagrams, rehype-slug for
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
          // next-mdx-remote v6 disables MDX `{expression}` evaluation by default
          // (`blockJS: true`). Authored content rendered here may legitimately use
          // expressions, so we restore the v5 behaviour by allowing JS while keeping
          // the v6 RCE guard (`blockDangerousJS: true`, the secure default) in place.
          blockJS: false,
          mdxOptions: {
            remarkPlugins: [remarkGfm, remarkDirective, remarkCallouts, remarkMermaid],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rehypePlugins: [rehypeSlug, [rehypePrettyCode as any, prettyCodeOptions]],
          },
        }}
      />
    </div>
  );
}
