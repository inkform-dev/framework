/**
 * The MDX pipeline in one place: the remark/rehype plugin lists and compile
 * options that `<Mdx>` (./mdx) renders with, plus `compileMdx()` for hosts
 * that render MDX to a React element themselves instead of through a React
 * Server Component (the Astro integration renders it to static HTML at build
 * time). Both paths read the same lists, so a page looks the same either way.
 *
 * No `next` import here: next-mdx-remote's `rsc` entry only needs React.
 */

import type { ComponentType, ReactElement } from 'react';
import { compileMDX } from 'next-mdx-remote/rsc';
import type { MDXRemoteProps } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import { visit } from 'unist-util-visit';
import { remarkCallouts } from './remark-directives';
import { remarkMermaid } from './remark-mermaid';

type SerializeOptions = NonNullable<MDXRemoteProps['options']>;
type MdxCompileOptions = NonNullable<SerializeOptions['mdxOptions']>;
type PluginList = NonNullable<MdxCompileOptions['remarkPlugins']>;

/** Shiki themes for fenced code: both are emitted as CSS variables, prose.css picks one per color scheme. */
export const prettyCodeOptions = {
  theme: { light: 'github-light', dark: 'github-dark' },
  keepBackground: false,
};

/** GFM, `:::callout` directives (and inline `:word` kept as text), ```mermaid fences → `<Mermaid>`. */
export const remarkPlugins: PluginList = [remarkGfm, remarkDirective, remarkCallouts, remarkMermaid];

/** Heading ids that match `extractHeadings` (TOC anchors), then Shiki highlighting. */
export const rehypePlugins: PluginList = [
  rehypeSlug,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [rehypePrettyCode as any, prettyCodeOptions],
];

/**
 * next-mdx-remote options. v6 disables MDX `{expression}` evaluation by
 * default (`blockJS: true`); authored content may use expressions, so they
 * stay on, while v6's guard against dangerous expressions (`blockDangerousJS`,
 * default true) stays in place.
 */
export const mdxRemoteOptions: SerializeOptions = {
  blockJS: false,
  mdxOptions: { remarkPlugins, rehypePlugins },
};

type MdxComponent = ComponentType<Record<string, unknown>>;

/** Collects every capitalized JSX element name the MDX uses (`<Card>`, not `<Foo.Bar>` or `<div>`). */
function remarkComponentNames(names: Set<string>) {
  return () => (tree: Parameters<typeof visit>[0]) => {
    visit(tree, (node) => {
      const n = node as { type: string; name?: unknown };
      if (
        (n.type === 'mdxJsxFlowElement' || n.type === 'mdxJsxTextElement') &&
        typeof n.name === 'string' &&
        /^[A-Z][\w]*$/.test(n.name)
      ) {
        names.add(n.name);
      }
    });
  };
}

/**
 * Compiles an MDX body (no frontmatter) to a React element, with the same
 * plugins and options as `<Mdx>`. Pass `mdxComponents()` from ./components:
 * every capitalized component the source uses but the map doesn't register
 * resolves through the map's fallback (a visible `fw-unknown` block) instead
 * of failing the render.
 *
 * Why the names are collected: compiled MDX copies the `components` prop
 * with an object spread, which only sees a map's own keys. A Proxy fallback
 * is invisible to that, so the names the source uses are read from the tree
 * during compilation and looked up on the map before React renders.
 */
export async function compileMdx(
  source: string,
  components: Record<string, MdxComponent>,
): Promise<ReactElement> {
  const names = new Set<string>();
  const resolved: Record<string, MdxComponent> = { ...components };
  const { content } = await compileMDX({
    source,
    components: resolved,
    options: {
      ...mdxRemoteOptions,
      mdxOptions: {
        ...mdxRemoteOptions.mdxOptions,
        remarkPlugins: [...remarkPlugins, remarkComponentNames(names)],
      },
    },
  });
  // `content` holds a reference to `resolved` and reads it when it renders,
  // which is after this point.
  for (const name of names) {
    if (!(name in resolved)) {
      const fallback = components[name];
      if (fallback) resolved[name] = fallback;
    }
  }
  return content;
}
