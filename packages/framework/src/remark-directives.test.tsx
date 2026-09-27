import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { evaluate } from '@mdx-js/mdx';
import remarkDirective from 'remark-directive';
import { describe, expect, it } from 'vitest';
import { remarkCallouts } from './remark-directives';
import { mdxComponents } from './components';

async function render(source: string) {
  const { default: Content } = await evaluate(source, { ...runtime, remarkPlugins: [remarkDirective, remarkCallouts] });
  return renderToStaticMarkup(<Content components={mdxComponents()} />);
}

describe('remarkCallouts', () => {
  it('maps :::note containers onto <Callout>', async () => {
    const html = await render(':::note\nHeads up.\n:::\n');
    expect(html).toContain('Heads up.');
    expect(html).not.toContain('<div></div>');
  });

  it('keeps inline colons as text instead of an empty directive element', async () => {
    const html = await render('Google studied teams ([re:Work](https://example.com)). Note:this stays.\n');
    expect(html).toContain('>re:Work</a>');
    expect(html).toContain('Note:this stays.');
    expect(html).not.toContain('<div');
  });
});
