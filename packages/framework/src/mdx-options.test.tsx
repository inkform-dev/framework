import * as React from 'react';
import { prerender } from 'react-dom/static';
import { describe, expect, it } from 'vitest';
import { mdxComponents } from './components';
import { compileMdx, mdxRemoteOptions, rehypePlugins, remarkPlugins } from './mdx-options';

async function html(source: string, extra: Record<string, React.ComponentType<Record<string, unknown>>> = {}) {
  const element = await compileMdx(source, mdxComponents(extra));
  const { prelude } = await prerender(element);
  return new Response(prelude).text();
}

describe('mdx-options', () => {
  it('is the plugin list <Mdx> renders with', () => {
    expect(mdxRemoteOptions.blockJS).toBe(false);
    expect(mdxRemoteOptions.mdxOptions?.remarkPlugins).toBe(remarkPlugins);
    expect(mdxRemoteOptions.mdxOptions?.rehypePlugins).toBe(rehypePlugins);
    expect(remarkPlugins).toHaveLength(4);
    expect(rehypePlugins).toHaveLength(2);
  });
});

describe('compileMdx', () => {
  it('runs the shared remark pipeline: GFM, callout directives, mermaid fences', async () => {
    const out = await html(':::warning\nCareful.\n:::\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n```mermaid\ngraph TD\n  A --> B\n```\n');
    expect(out).toContain('fw-callout fw-callout-warning');
    expect(out).toContain('<table>');
    expect(out).toContain('fw-mermaid-static');
  });

  it('runs the shared rehype pipeline: heading ids and Shiki', async () => {
    const out = await html('## Getting started\n\n```js\nconst a = 1;\n```\n');
    expect(out).toContain('<h2 id="getting-started">');
    expect(out).toContain('data-rehype-pretty-code-figure');
    expect(out).toContain('--shiki-dark');
  });

  it('renders kit components without imports', async () => {
    const out = await html('<Tabs><Tab title="One">first</Tab><Tab title="Two">second</Tab></Tabs>\n\n<Steps><Step title="Go">Now.</Step></Steps>');
    expect(out).toContain('fw-tabs-trigger--active');
    expect(out).toContain('second');
    expect(out).toContain('fw-step-title');
  });

  it('renders an unregistered component as the visible fallback instead of throwing', async () => {
    const out = await html('Before\n\n<NotAComponent>inside</NotAComponent>\n\nAfter <InlineThing />');
    const text = out.replaceAll('<!-- -->', '');
    expect(text).toContain('<div class="fw-unknown"><code>&lt;NotAComponent /&gt;</code>');
    expect(text).toContain('<div class="fw-unknown-children">inside</div>');
    expect(text).toContain('&lt;InlineThing /&gt;');
  });

  it('prefers a registered component over the fallback', async () => {
    const Widget = () => <span className="my-widget">ok</span>;
    const out = await html('<Widget />', { Widget });
    expect(out).toContain('my-widget');
    expect(out).not.toContain('fw-unknown');
  });
});
