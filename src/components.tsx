import * as React from 'react';
import { SubscribeForm } from './subscribe-form';

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

type CalloutType = 'info' | 'warning' | 'error' | 'success' | 'note' | 'tip';

export function Callout({ type = 'info', children }: { type?: CalloutType; children?: React.ReactNode }) {
  const variant = type === 'note' || type === 'tip' ? 'info' : type;
  return <div className={`fw-callout fw-callout-${variant}`}>{children}</div>;
}

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
        <span className={`fw-apiref-method fw-method-${(method ?? 'get').toLowerCase()}`}>{method}</span>
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

const BUILTINS: Record<string, React.ComponentType<Record<string, unknown>>> = {
  Callout: Callout as React.ComponentType<Record<string, unknown>>,
  Embed: Embed as React.ComponentType<Record<string, unknown>>,
  Hero: Hero as React.ComponentType<Record<string, unknown>>,
  AuthorBio: AuthorBio as React.ComponentType<Record<string, unknown>>,
  TableOfContents: TableOfContents as React.ComponentType<Record<string, unknown>>,
  RelatedPosts: RelatedPosts as React.ComponentType<Record<string, unknown>>,
  NewsletterCTA: NewsletterCTA as React.ComponentType<Record<string, unknown>>,
  ApiReference: ApiReference as React.ComponentType<Record<string, unknown>>,
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

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}
