import * as React from 'react';
import { SubscribeForm } from './subscribe-form';
// Interactive ('use client') components are isolated in their own module so this
// server-importable file stays RSC-safe.
import {
  Tabs,
  Tab,
  CodeGroup,
  Accordion,
  AccordionGroup,
} from './interactive';

export { Tabs, Tab, CodeGroup, Accordion, AccordionGroup } from './interactive';
export type { TabProps, TabsProps, CodeGroupProps, AccordionProps, AccordionGroupProps } from './interactive';

/**
 * Built-in MDX components — the render targets for the editor's blocks
 * (`:::info` callouts, `<Embed/>`, `<Hero/>`, `<NewsletterCTA/>`, …). Styled
 * with plain `fw-*` CSS classes (see styles.css) so the framework is standalone
 * — no Tailwind required in the consuming site.
 *
 * Unknown components (user-authored widgets in /widgets/ the framework doesn't
 * know) render via a visible Fallback instead of crashing the build — see
 * `mdxComponents()`.
 */

/* ---------------------------------------------------------------------------
 * Callout family
 * -------------------------------------------------------------------------*/

type CalloutType = 'info' | 'warning' | 'error' | 'success' | 'note' | 'tip' | 'danger' | 'check';

const CALLOUT_ICONS: Record<CalloutType, string> = {
  info: 'info',
  note: 'info',
  tip: 'lightbulb',
  warning: 'triangle-alert',
  danger: 'octagon-x',
  error: 'circle-x',
  success: 'circle-check',
  check: 'circle-check',
};

const CALLOUT_VARIANT_MAP: Record<CalloutType, string> = {
  info: 'info',
  note: 'info',
  tip: 'info',
  warning: 'warning',
  danger: 'error',
  error: 'error',
  success: 'success',
  check: 'success',
};

export function Callout({
  type = 'info',
  icon,
  children,
}: {
  type?: CalloutType;
  icon?: React.ReactNode | string;
  children?: React.ReactNode;
}) {
  const variant = CALLOUT_VARIANT_MAP[type] ?? 'info';
  const defaultIconName = CALLOUT_ICONS[type] ?? 'info';

  const iconNode =
    icon !== undefined
      ? typeof icon === 'string'
        ? <span className="fw-icon" data-icon={icon} aria-hidden="true" />
        : icon
      : <span className="fw-icon" data-icon={defaultIconName} aria-hidden="true" />;

  return (
    <div className={`fw-callout fw-callout-${variant}`} role="note">
      <span className="fw-callout-icon">{iconNode}</span>
      <div className="fw-callout-body">{children}</div>
    </div>
  );
}

/** Shorthand callout wrappers */
export function Note({ children }: { children?: React.ReactNode }) {
  return <Callout type="note">{children}</Callout>;
}
export function Tip({ children }: { children?: React.ReactNode }) {
  return <Callout type="tip">{children}</Callout>;
}
export function Info({ children }: { children?: React.ReactNode }) {
  return <Callout type="info">{children}</Callout>;
}
export function Warning({ children }: { children?: React.ReactNode }) {
  return <Callout type="warning">{children}</Callout>;
}
export function Danger({ children }: { children?: React.ReactNode }) {
  return <Callout type="danger">{children}</Callout>;
}
export function Check({ children }: { children?: React.ReactNode }) {
  return <Callout type="check">{children}</Callout>;
}

/* ---------------------------------------------------------------------------
 * Card / CardGroup
 * -------------------------------------------------------------------------*/

export interface CardProps {
  title?: string;
  icon?: React.ReactNode | string;
  href?: string;
  horizontal?: boolean;
  children?: React.ReactNode;
}

export function Card({ title, icon, href, horizontal = false, children }: CardProps) {
  const iconNode =
    icon === undefined || icon === null
      ? null
      : typeof icon === 'string'
        ? <span className="fw-icon" data-icon={icon} aria-hidden="true" />
        : icon;

  const inner = (
    <div className={`fw-card${horizontal ? ' fw-card--horizontal' : ''}`}>
      {iconNode && <span className="fw-card-icon">{iconNode}</span>}
      <div className="fw-card-content">
        {title && <p className="fw-card-title">{title}</p>}
        {children && <div className="fw-card-body">{children}</div>}
      </div>
      {href && <span className="fw-card-arrow" aria-hidden="true" />}
    </div>
  );

  if (href) {
    return (
      <a className="fw-card-link" href={href}>
        {inner}
      </a>
    );
  }
  return inner;
}

export interface CardGroupProps {
  cols?: number;
  children?: React.ReactNode;
}

export function CardGroup({ cols = 2, children }: CardGroupProps) {
  return (
    <div
      className="fw-cardgroup"
      style={{ '--fw-cardgroup-cols': cols } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Columns
 * -------------------------------------------------------------------------*/

export interface ColumnsProps {
  cols?: number;
  children?: React.ReactNode;
}

export function Columns({ cols = 2, children }: ColumnsProps) {
  return (
    <div
      className="fw-columns"
      style={{ '--fw-columns-count': cols } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Steps / Step
 * -------------------------------------------------------------------------*/

export interface StepsProps {
  children?: React.ReactNode;
}

export function Steps({ children }: StepsProps) {
  return <ol className="fw-steps">{children}</ol>;
}

export interface StepProps {
  title: string;
  icon?: React.ReactNode | string;
  children?: React.ReactNode;
}

export function Step({ title, icon, children }: StepProps) {
  const iconNode =
    icon === undefined || icon === null
      ? null
      : typeof icon === 'string'
        ? <span className="fw-icon" data-icon={icon} aria-hidden="true" />
        : icon;

  return (
    <li className="fw-step">
      <div className="fw-step-marker">
        {iconNode ?? <span className="fw-step-number" aria-hidden="true" />}
      </div>
      <div className="fw-step-content">
        <p className="fw-step-title">{title}</p>
        {children && <div className="fw-step-body">{children}</div>}
      </div>
    </li>
  );
}

/* ---------------------------------------------------------------------------
 * ParamField / ResponseField
 * -------------------------------------------------------------------------*/

export interface ParamFieldProps {
  query?: string;
  path?: string;
  body?: string;
  header?: string;
  name?: string;
  type?: string;
  required?: boolean;
  deprecated?: boolean;
  default?: unknown;
  children?: React.ReactNode;
}

export function ParamField({
  query,
  path,
  body,
  header,
  name,
  type,
  required = false,
  deprecated = false,
  default: defaultValue,
  children,
}: ParamFieldProps) {
  const fieldName = name ?? query ?? path ?? body ?? header ?? '';
  const location = query ? 'query' : path ? 'path' : body ? 'body' : header ? 'header' : undefined;

  return (
    <div className={`fw-param${deprecated ? ' fw-param--deprecated' : ''}`}>
      <div className="fw-param-header">
        <code className="fw-param-name">{fieldName}</code>
        {type && <span className="fw-param-type">{type}</span>}
        {location && <span className="fw-param-location">{location}</span>}
        {required && <span className="fw-param-required">required</span>}
        {deprecated && <span className="fw-param-deprecated">deprecated</span>}
        {defaultValue !== undefined && (
          <span className="fw-param-default">
            default: <code>{String(defaultValue)}</code>
          </span>
        )}
      </div>
      {children && <div className="fw-param-body">{children}</div>}
    </div>
  );
}

export interface ResponseFieldProps {
  name: string;
  type?: string;
  required?: boolean;
  children?: React.ReactNode;
}

export function ResponseField({ name, type, required = false, children }: ResponseFieldProps) {
  return (
    <div className="fw-response-field">
      <div className="fw-response-field-header">
        <code className="fw-param-name">{name}</code>
        {type && <span className="fw-param-type">{type}</span>}
        {required && <span className="fw-param-required">required</span>}
      </div>
      {children && <div className="fw-param-body">{children}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Expandable
 * -------------------------------------------------------------------------*/

export interface ExpandableProps {
  title?: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

export function Expandable({ title = 'Show more', defaultOpen = false, children }: ExpandableProps) {
  return (
    <details className="fw-expandable" open={defaultOpen}>
      <summary className="fw-expandable-summary">{title}</summary>
      <div className="fw-expandable-body">{children}</div>
    </details>
  );
}

/* ---------------------------------------------------------------------------
 * Frame
 * -------------------------------------------------------------------------*/

export interface FrameProps {
  caption?: string;
  children?: React.ReactNode;
}

export function Frame({ caption, children }: FrameProps) {
  return (
    <figure className="fw-frame">
      <div className="fw-frame-inner">{children}</div>
      {caption && <figcaption className="fw-frame-caption">{caption}</figcaption>}
    </figure>
  );
}

/* ---------------------------------------------------------------------------
 * Tooltip
 * -------------------------------------------------------------------------*/

export interface TooltipProps {
  tip: string;
  children?: React.ReactNode;
}

export function Tooltip({ tip, children }: TooltipProps) {
  return (
    <span className="fw-tooltip" data-tip={tip} title={tip}>
      {children}
      <span className="fw-tooltip-bubble" role="tooltip" aria-label={tip}>
        {tip}
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
 * Existing components (kept / updated)
 * -------------------------------------------------------------------------*/

export function Embed({ provider, url }: { provider?: string; url?: string }) {
  if (!url) return null;
  if (provider === 'youtube') {
    const id = youtubeId(url);
    if (id) {
      return (
        <div className="fw-embed fw-embed-16x9">
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
  }
  if (provider === 'loom') {
    return (
      <div className="fw-embed fw-embed-16x9">
        <iframe src={url.replace('/share/', '/embed/')} title="Loom video" allowFullScreen />
      </div>
    );
  }
  if (provider === 'iframe') {
    return (
      <div className="fw-embed fw-embed-16x9">
        <iframe src={url} title="Embedded content" />
      </div>
    );
  }
  return (
    <a className="fw-embed-link" href={url} target="_blank" rel="noreferrer">
      {url}
    </a>
  );
}

export function Hero({ src, alt = '' }: { src?: string; alt?: string }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="fw-hero" src={src} alt={alt} />;
}

export function AuthorBio({ name, bio, avatar }: { name?: string; bio?: string; avatar?: string }) {
  if (!name) return null;
  return (
    <div className="fw-authorbio">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="fw-authorbio-avatar" src={avatar} alt={name} />
      ) : null}
      <div>
        <div className="fw-authorbio-name">{name}</div>
        {bio ? <div className="fw-authorbio-text">{bio}</div> : null}
      </div>
    </div>
  );
}

export function TableOfContents() {
  // The on-this-page list is rendered by the docs layout from headings; this
  // inline marker lets authors place an explicit ToC anchor in the body.
  return <div className="fw-toc" data-fw-toc aria-hidden />;
}

export function RelatedPosts({ slugs, basePath = '/blog' }: { slugs?: string[]; basePath?: string }) {
  if (!slugs?.length) return null;
  return (
    <nav className="fw-related">
      <p className="fw-related-title">Related</p>
      <ul>
        {slugs.map((s) => (
          <li key={s}>
            <a href={`${basePath}/${s}`}>{s}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function NewsletterCTA({
  projectId,
  apiBaseUrl,
  heading = 'Subscribe to the newsletter',
}: {
  projectId?: string;
  apiBaseUrl?: string;
  heading?: string;
}) {
  return (
    <div className="fw-cta">
      <p className="fw-cta-heading">{heading}</p>
      {projectId ? (
        <SubscribeForm projectId={projectId} apiBaseUrl={apiBaseUrl} />
      ) : (
        <p className="fw-cta-note">Set a projectId to enable the form.</p>
      )}
    </div>
  );
}

export function ApiReference({ spec, endpoint }: { spec?: string; endpoint?: string }) {
  const [method, ...rest] = (endpoint ?? 'GET /').split(' ');
  return (
    <div className="fw-apiref">
      <div className="fw-apiref-head">
        <span className={`fw-method-pill fw-method-${(method ?? 'get').toLowerCase()}`}>{method}</span>
        <code className="fw-apiref-path">{rest.join(' ')}</code>
      </div>
      {spec ? <p className="fw-apiref-note">from {spec}</p> : null}
    </div>
  );
}

export function Playground({ template = 'react' }: { template?: string }) {
  return (
    <div className="fw-playground">
      <span className="fw-playground-badge">Playground · {template}</span>
      <p className="fw-playground-note">Interactive sandbox renders here.</p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Fallback for unknown component names
 * -------------------------------------------------------------------------*/

function Fallback(name: string) {
  const Comp = (props: Record<string, unknown> & { children?: React.ReactNode }) => (
    <div className="fw-unknown">
      <code>&lt;{name} /&gt;</code>
      {props.children ? <div className="fw-unknown-children">{props.children as React.ReactNode}</div> : null}
    </div>
  );
  Comp.displayName = `Fallback(${name})`;
  return Comp;
}

/* ---------------------------------------------------------------------------
 * BUILTINS map — all components registered for MDX
 * -------------------------------------------------------------------------*/

const BUILTINS: Record<string, React.ComponentType<Record<string, unknown>>> = {
  // Callout family
  Callout: Callout as React.ComponentType<Record<string, unknown>>,
  Note: Note as React.ComponentType<Record<string, unknown>>,
  Tip: Tip as React.ComponentType<Record<string, unknown>>,
  Info: Info as React.ComponentType<Record<string, unknown>>,
  Warning: Warning as React.ComponentType<Record<string, unknown>>,
  Danger: Danger as React.ComponentType<Record<string, unknown>>,
  Check: Check as React.ComponentType<Record<string, unknown>>,
  // Cards
  Card: Card as React.ComponentType<Record<string, unknown>>,
  CardGroup: CardGroup as React.ComponentType<Record<string, unknown>>,
  // Layout
  Columns: Columns as React.ComponentType<Record<string, unknown>>,
  // Steps
  Steps: Steps as React.ComponentType<Record<string, unknown>>,
  Step: Step as unknown as React.ComponentType<Record<string, unknown>>,
  // Interactive (client islands, imported from interactive.tsx)
  Tabs: Tabs as React.ComponentType<Record<string, unknown>>,
  Tab: Tab as unknown as React.ComponentType<Record<string, unknown>>,
  CodeGroup: CodeGroup as React.ComponentType<Record<string, unknown>>,
  Accordion: Accordion as unknown as React.ComponentType<Record<string, unknown>>,
  AccordionGroup: AccordionGroup as React.ComponentType<Record<string, unknown>>,
  // API docs
  ParamField: ParamField as React.ComponentType<Record<string, unknown>>,
  ResponseField: ResponseField as unknown as React.ComponentType<Record<string, unknown>>,
  // Misc
  Expandable: Expandable as React.ComponentType<Record<string, unknown>>,
  Frame: Frame as React.ComponentType<Record<string, unknown>>,
  Tooltip: Tooltip as unknown as React.ComponentType<Record<string, unknown>>,
  // Media / embeds
  Embed: Embed as React.ComponentType<Record<string, unknown>>,
  Hero: Hero as React.ComponentType<Record<string, unknown>>,
  // Author / blog
  AuthorBio: AuthorBio as React.ComponentType<Record<string, unknown>>,
  TableOfContents: TableOfContents as React.ComponentType<Record<string, unknown>>,
  RelatedPosts: RelatedPosts as React.ComponentType<Record<string, unknown>>,
  // Newsletter
  NewsletterCTA: NewsletterCTA as React.ComponentType<Record<string, unknown>>,
  // API inline reference
  ApiReference: ApiReference as React.ComponentType<Record<string, unknown>>,
  // Sandbox
  Playground: Playground as React.ComponentType<Record<string, unknown>>,
};

/**
 * Returns the component map for MDX. A Proxy supplies a visible Fallback for
 * any capitalized component the MDX references but we don't ship (user widgets),
 * so a stray `<MyWidget/>` never breaks the build. Pass `extra` to register
 * real widget implementations from the consuming site.
 */
export function mdxComponents(
  extra: Record<string, React.ComponentType<Record<string, unknown>>> = {},
): Record<string, React.ComponentType<Record<string, unknown>>> {
  const merged = { ...BUILTINS, ...extra };
  return new Proxy(merged, {
    get(target, prop) {
      if (typeof prop !== 'string') return Reflect.get(target, prop);
      if (prop in target) return target[prop];
      // Synthesize a visible fallback only for capitalized JSX component names.
      if (/^[A-Z]/.test(prop)) return Fallback(prop);
      return undefined;
    },
    has(target, prop) {
      // Report capitalized component names as present so MDX routes them
      // through `get` (→ Fallback) instead of throwing; lowercase host tags
      // and internal/symbol keys behave normally.
      if (typeof prop === 'string' && /^[A-Z]/.test(prop)) return true;
      return Reflect.has(target, prop);
    },
  });
}

/* ---------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------*/

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}
