/**
 * Server-side rendering of the parts that come from @inkform/framework's
 * React kit: MDX bodies and API operation pages. React runs here, at build
 * time, and only its HTML reaches the page; the browser gets no React. The
 * interactive pieces of that HTML (tabs, code groups, sample switchers, Try
 * It) are wired up by the small scripts in ../client.
 *
 * The kit is used as-is, so the markup (and the `fw-*` classes the
 * framework's CSS styles) matches the Next.js themes exactly.
 */

import { createElement, type ReactNode } from 'react';
import { prerender } from 'react-dom/static';
import { mdxComponents } from '@inkform/framework/components';
import { compileMdx } from '@inkform/framework/mdx-options';
import type { ApiOperation, OpenApiServer } from '@inkform/framework/openapi';
import { OperationPage } from '@inkform/framework/openapi-render';
import { InlineStyleSheet, type HrefRewriter } from './inline-styles';
import { siteComponents, type MdxComponent, type SiteComponentOptions } from './mdx-components';

export interface PageRendererOptions extends SiteComponentOptions {
  /** The site's own MDX components, merged over the kit's (see userComponents). */
  components?: Record<string, MdxComponent>;
  /** Applied to every link in the rendered HTML (see siteHrefRewriter). */
  rewriteHref?: HrefRewriter;
  /** Applied to every image source (see assetRewriter). */
  rewriteSrc?: HrefRewriter;
}

/** Renders a React tree to an HTML string, waiting for async components (OperationPage, ApiLink). */
export async function renderToHtml(node: ReactNode, idPrefix: string): Promise<string> {
  const { prelude } = await prerender(node, { identifierPrefix: idPrefix });
  return new Response(prelude).text();
}

/** One page's HTML fragments plus the stylesheet their inline styles moved to. */
export class PageRenderer {
  readonly styles = new InlineStyleSheet();
  private count = 0;

  constructor(private readonly options: PageRendererOptions) {}

  /** An MDX body (frontmatter already removed) as HTML, inside `.fw-prose`. */
  async mdx(source: string, extra: Record<string, MdxComponent> = {}): Promise<string> {
    const components = mdxComponents({ ...siteComponents(this.options), ...this.options.components, ...extra });
    const element = await compileMdx(source, components);
    const html = await renderToHtml(createElement('div', { className: 'fw-prose' }, element), this.nextPrefix());
    return this.styles.extract(html, { href: this.options.rewriteHref, src: this.options.rewriteSrc });
  }

  /** The framework's full operation page: header, Try It trigger, parameters, responses, samples. */
  async operation(operation: ApiOperation, servers: OpenApiServer[]): Promise<string> {
    const html = await renderToHtml(createElement(OperationPage, { operation, servers }), this.nextPrefix());
    return this.styles.extract(html, { href: this.options.rewriteHref, src: this.options.rewriteSrc });
  }

  /** Each render on a page gets its own `useId` prefix, so ids never collide. */
  private nextPrefix(): string {
    this.count += 1;
    return `fw${this.count}-`;
  }
}
