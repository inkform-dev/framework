/**
 * The few kit components that render differently on an Astro site. Everything
 * else comes from `mdxComponents()` unchanged.
 *
 * - `ApiLink` links to the native operation page under this site's base and
 *   resolves synchronously from the already-parsed spec (the framework's one
 *   reads docs.json and the spec itself, and builds Scalar-style hash links).
 * - `Mermaid`, when the `mermaid` option is on, prints a placeholder that
 *   ../client/mermaid.ts draws into.
 * - `NewsletterCTA` prints its endpoint and project on the form, for
 *   ../client/kit.ts to submit without React.
 *
 * Written with createElement, not JSX, so this file needs no JSX settings.
 */

import { createElement as h, type ReactNode } from 'react';

export interface OperationRef {
  href: string;
  summary: string;
}

export interface SiteComponentOptions {
  mermaid: boolean;
  /** Looks up an operation for `<ApiLink>`; null when the site has no API Reference. */
  operation: ((operationId: string) => OperationRef | null) | null;
}

type Props = Record<string, unknown> & { children?: ReactNode };

export function siteComponents(options: SiteComponentOptions) {
  function ApiLink({ operationId, children }: Props) {
    if (typeof operationId !== 'string' || !operationId) {
      throw new Error('<ApiLink> requires an operationId prop.');
    }
    if (!options.operation) {
      throw new Error(
        `<ApiLink operationId="${operationId}"> was used, but this site has no API Reference (docs.json's "openapi" field on a tab).`,
      );
    }
    const op = options.operation(operationId);
    if (!op) {
      throw new Error(
        `<ApiLink operationId="${operationId}">: no operation with this id in the OpenAPI spec. Check the spec's operationId or update this link.`,
      );
    }
    return h('a', { href: op.href }, children ?? op.summary);
  }

  function MermaidFigure({ chart, caption }: Props) {
    const source = typeof chart === 'string' ? chart.trim() : '';
    const label = typeof caption === 'string' && caption ? caption : undefined;
    return h(
      'figure',
      { className: 'fw-mermaid', 'data-fw-mermaid': '', 'data-chart': source, 'data-caption': label },
      h(
        'div',
        { className: 'fw-mermaid-placeholder', 'aria-busy': 'true', 'aria-label': `${label ?? 'Diagram'} (loading)` },
        h('noscript', null, h('pre', null, h('code', { className: 'language-mermaid' }, source))),
      ),
      label ? h('figcaption', { className: 'fw-mermaid-caption' }, label) : null,
    );
  }

  function NewsletterCTA({ projectId, apiBaseUrl, heading }: Props) {
    const endpoint = `${typeof apiBaseUrl === 'string' ? apiBaseUrl.replace(/\/$/, '') : ''}/api/newsletter/subscribe`;
    return h(
      'div',
      { className: 'fw-cta' },
      h('p', { className: 'fw-cta-heading' }, typeof heading === 'string' ? heading : 'Subscribe to the newsletter'),
      typeof projectId === 'string' && projectId
        ? h(
            'form',
            { className: 'fw-subscribe', 'data-fw-subscribe': '', 'data-endpoint': endpoint, 'data-project-id': projectId },
            h('input', { type: 'email', name: 'email', required: true, placeholder: 'you@example.com', 'aria-label': 'Email' }),
            h('button', { type: 'submit', disabled: true }, 'Subscribe'),
          )
        : h('p', { className: 'fw-cta-note' }, 'Set a projectId to enable the form.'),
    );
  }

  return {
    ApiLink,
    NewsletterCTA,
    ...(options.mermaid ? { Mermaid: MermaidFigure } : {}),
  };
}
