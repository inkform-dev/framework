import * as React from 'react';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { evaluate } from '@mdx-js/mdx';
import { describe, expect, it } from 'vitest';
import { remarkMermaid } from './remark-mermaid';
import { mdxComponents } from './components';

type Props = Record<string, unknown>;

async function render(source: string, extra: Record<string, React.ComponentType<Props>> = {}) {
  const { default: Content } = await evaluate(source, { ...runtime, remarkPlugins: [remarkMermaid] });
  return renderToStaticMarkup(<Content components={mdxComponents(extra)} />);
}

describe('remarkMermaid', () => {
  it('turns a mermaid fence into <Mermaid chart>', async () => {
    const seen: Props[] = [];
    const Spy = (props: Props) => {
      seen.push(props);
      return null;
    };
    await render('```mermaid\ngraph TD\n  A --> B\n```\n', { Mermaid: Spy });
    expect(seen).toHaveLength(1);
    expect(seen[0].chart).toBe('graph TD\n  A --> B');
    expect(seen[0].caption).toBeUndefined();
  });

  it('reads a caption from title= or caption= in the fence meta', async () => {
    const seen: Props[] = [];
    const Spy = (props: Props) => {
      seen.push(props);
      return null;
    };
    await render('```mermaid title="Hiring flow"\ngraph LR\n  A --> B\n```\n\n```mermaid caption=\'Org\'\ngraph TD\n  L --> D\n```\n', {
      Mermaid: Spy,
    });
    expect(seen.map((p) => p.caption)).toEqual(['Hiring flow', 'Org']);
  });

  it('leaves other fences alone', async () => {
    const html = await render('```js\nconst a = 1;\n```\n');
    expect(html).toContain('<code class="language-js">');
  });

  it('falls back to a static source block without the interactive renderer', async () => {
    const html = await render('```mermaid\ngraph TD\n  A --> B\n```\n');
    expect(html).toContain('fw-mermaid-static');
    expect(html).toContain('graph TD\n  A --&gt; B');
    expect(html).not.toContain('fw-unknown');
  });
});
