import { describe, expect, it } from 'vitest';
import { headingsFromHtml } from './headings';
import { docsLinkRewriter } from './inline-styles';
import { PageRenderer } from './render';
import { createLinker } from './routes';
import type { ApiOperation } from '@inkform/framework/openapi';

const link = createLinker('/docs', 'ignore');

function renderer(options: Partial<ConstructorParameters<typeof PageRenderer>[0]> = {}) {
  return new PageRenderer({
    mermaid: false,
    operation: (id) => (id === 'list-plants' ? { href: link('api-reference/operations/list-plants'), summary: 'List plants' } : null),
    rewriteHref: docsLinkRewriter(new Set(['quickstart', 'guides/setup']), link),
    ...options,
  });
}

const KIT = `
<Callout type="warning">c</Callout>
<Note>n</Note><Tip>t</Tip><Info>i</Info><Warning>w</Warning><Danger>d</Danger><Check>k</Check>

:::info
directive
:::

<CardGroup cols={3}><Card title="A" icon="zap" href="/quickstart">a</Card></CardGroup>
<Columns cols={2}><div>one</div><div>two</div></Columns>
<Steps><Step title="S1">s</Step></Steps>
<Tabs><Tab title="First">first panel</Tab><Tab title="Second">second panel</Tab></Tabs>
<AccordionGroup><Accordion title="Q">A</Accordion></AccordionGroup>
<CodeGroup>
\`\`\`bash npm
npm i x
\`\`\`

\`\`\`bash pnpm
pnpm add x
\`\`\`
</CodeGroup>
<ParamField query="limit" type="integer">l</ParamField>
<ResponseField name="id" type="string">r</ResponseField>
<Expandable title="More">m</Expandable>
<Frame caption="f">frame</Frame>
<Tooltip tip="tip text">hover</Tooltip>
<Embed provider="youtube" url="https://youtu.be/dQw4w9WgXcQ" />
`;

describe('PageRenderer.mdx', () => {
  it('renders every kit component with the framework’s markup', async () => {
    const html = await renderer().mdx(KIT);
    for (const cls of [
      'fw-prose',
      'fw-callout fw-callout-warning',
      'fw-callout fw-callout-error',
      'fw-callout fw-callout-success',
      'fw-cardgroup',
      'fw-card-link',
      'fw-columns',
      'fw-steps',
      'fw-tabs',
      'fw-accordion-group',
      'fw-codegroup',
      'fw-mdx-param',
      'fw-response-field',
      'fw-expandable',
      'fw-frame',
      'fw-tooltip',
      'fw-embed fw-embed-16x9',
    ]) {
      expect(html, cls).toContain(`class="${cls}`);
    }
  });

  it('prints every tab panel, all but the first hidden', async () => {
    const html = await renderer().mdx('<Tabs><Tab title="One">first</Tab><Tab title="Two">second</Tab></Tabs>');
    expect(html).toMatch(/role="tabpanel"[^>]*class="fw-tabs-panel"[^>]*>first/);
    expect(html).toMatch(/role="tabpanel"[^>]*hidden[^>]*class="fw-tabs-panel"[^>]*>second/);
  });

  it('moves inline styles into the page stylesheet', async () => {
    const r = renderer();
    const html = await r.mdx('<CardGroup cols={3}><Card title="x">y</Card></CardGroup>\n\n```js\nconst a = 1;\n```\n');
    expect(html).not.toMatch(/\sstyle="/);
    expect(r.styles.css).toContain('--fw-cardgroup-cols:3 !important');
    expect(r.styles.css).toMatch(/--shiki-light:#[0-9A-Fa-f]+ !important;--shiki-dark:#[0-9A-Fa-f]+ !important/);
  });

  it('gives each render on a page its own ids', async () => {
    const r = renderer();
    const a = await r.mdx('<Tabs><Tab title="A">a</Tab></Tabs>');
    const b = await r.mdx('<Tabs><Tab title="B">b</Tab></Tabs>');
    const id = (html: string) => /id="([^"]+)-tab-0"/.exec(html)?.[1];
    expect(id(a)).toBeTruthy();
    expect(id(a)).not.toBe(id(b));
  });

  it('adds the docs base to site-root links to docs pages only', async () => {
    const html = await renderer().mdx('[a](/quickstart#install) [b](/pricing) [c](/guides/setup/) [d](https://x.dev/quickstart) [e](/)');
    expect(html).toContain('href="/docs/quickstart#install"');
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('href="/docs/guides/setup"');
    expect(html).toContain('href="https://x.dev/quickstart"');
    expect(html).toContain('href="/"');
  });

  it('resolves <ApiLink> to the operation page, and fails on an unknown id', async () => {
    expect(await renderer().mdx('<ApiLink operationId="list-plants" />')).toContain(
      '<a href="/docs/api-reference/operations/list-plants">List plants</a>',
    );
    await expect(renderer().mdx('<ApiLink operationId="nope" />')).rejects.toThrow(/no operation with this id/);
    await expect(renderer({ operation: null }).mdx('<ApiLink operationId="x" />')).rejects.toThrow(/no API Reference/);
  });

  it('shows mermaid source by default, and a placeholder for the browser when enabled', async () => {
    const fence = '```mermaid title="Flow"\ngraph TD\n  A --> B\n```\n';
    expect(await renderer().mdx(fence)).toContain('fw-mermaid-static');
    const html = await renderer({ mermaid: true }).mdx(fence);
    expect(html).toContain('data-fw-mermaid');
    expect(html).toContain('data-chart="graph TD\n  A --&gt; B"');
    expect(html).toContain('<figcaption class="fw-mermaid-caption">Flow</figcaption>');
  });

  it('renders an unknown component as the visible fallback', async () => {
    const html = await renderer().mdx('<Nope>kids</Nope>');
    expect(html).toContain('fw-unknown');
    expect(html).toContain('kids');
  });

  it('gives the newsletter form its endpoint for the browser script', async () => {
    const html = await renderer().mdx('<NewsletterCTA projectId="p1" apiBaseUrl="https://api.x.dev/" />');
    expect(html).toContain('data-endpoint="https://api.x.dev/api/newsletter/subscribe"');
    expect(html).toContain('data-project-id="p1"');
  });

  it('feeds a TOC whose anchors match the rendered ids, repeats included', async () => {
    const html = await renderer().mdx('## Install\n\n### Install\n\n## Use `it`\n\n#### Too deep\n');
    expect(headingsFromHtml(html)).toEqual([
      { depth: 2, text: 'Install', slug: 'install' },
      { depth: 3, text: 'Install', slug: 'install-1' },
      { depth: 2, text: 'Use it', slug: 'use-it' },
    ]);
  });
});

describe('PageRenderer.operation', () => {
  const operation: ApiOperation = {
    method: 'post',
    path: '/plants',
    operationId: 'create-plant',
    summary: 'Create a plant',
    tag: 'Plants',
    parameters: [{ name: 'limit', in: 'query', required: false, schema: { type: 'integer' } }],
    requestBody: { required: true, contentType: 'application/json', schema: { type: 'object', properties: { name: { type: 'string' } } } },
    responses: [
      { status: '200', description: 'OK', contentType: 'application/json', schema: { type: 'object', properties: { id: { type: 'integer' } } } },
      { status: '400', description: 'Bad', contentType: 'application/json', schema: { type: 'object', properties: { error: { type: 'string' } } } },
    ],
    security: [{ key: 'bearerAuth', type: 'http', scheme: 'bearer' }],
  };

  it('renders the framework’s operation page with every sample in the HTML', async () => {
    const r = renderer();
    const html = await r.operation(operation, [{ url: 'https://api.example.com' }]);
    expect(html).toContain('class="fw-apiref-tryit"');
    expect(html).toContain('class="fw-apiref-sample-select"');
    expect((html.match(/class="fw-apiref-sample-code"/g) ?? []).length).toBeGreaterThanOrEqual(4 + 2);
    expect(html).toContain('fw-apiref-response-tab');
    expect(html).toContain('data-pagefind-filter="method:POST"');
    expect(html).not.toMatch(/\sstyle="/);
    expect(r.styles.css).toContain('--shiki-dark');
  });
});
