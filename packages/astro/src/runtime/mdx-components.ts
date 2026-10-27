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
 * The site's own components (the `components` option) are picked out of its
 * module by `userComponents()` and merged over all of these.
 *
 * Written with createElement, not JSX, so this file needs no JSX settings.
 */

import { createElement as h, type ComponentType, type ReactNode } from 'react';

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

export type MdxComponent = ComponentType<Record<string, unknown>>;

/** A function component, a class, or one of React's wrapper objects (`memo`, `forwardRef`, `lazy`). */
function isComponent(value: unknown): value is MdxComponent {
  return typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value);
}

/**
 * The MDX components in the site's `components` module: every export whose
 * name starts with a capital letter and is a component, plus the same from a
 * default export that is an object (`export default { Screenshot }`). Named
 * exports win over the default object's entries. Anything else in the module
 * (helpers, constants) is ignored.
 */
export function userComponents(mod: Record<string, unknown>): Record<string, MdxComponent> {
  const out: Record<string, MdxComponent> = {};
  const pick = (entries: Record<string, unknown>) => {
    for (const [name, value] of Object.entries(entries)) {
      if (/^[A-Z]/.test(name) && isComponent(value)) out[name] = value;
    }
  };
  const fallback = mod.default;
  if (typeof fallback === 'object' && fallback !== null && !isComponent(fallback)) pick(fallback as Record<string, unknown>);
  pick(mod);
  return out;
}
