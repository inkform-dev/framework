import * as React from 'react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { mdxComponents } from './components';
import { mdxRemoteOptions } from './mdx-options';

export { remarkMermaid } from './remark-mermaid';

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
        // Plugins and options are shared with compileMdx() (./mdx-options), so
        // hosts that render MDX outside a React Server Component get the same
        // output. blockJS stays off there too: see mdxRemoteOptions.
        options={mdxRemoteOptions}
      />
    </div>
  );
}
