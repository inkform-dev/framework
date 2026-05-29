'use client';

import * as React from 'react';

type Counts = { love: number; like: number; total: number };

type Props = {
  projectId: string;
  /** Content item slug (post/entry/page). */
  slug: string;
  /** Platform origin hosting /api/v1/reactions (e.g. https://freewritecms.com). */
  apiBaseUrl?: string;
  /**
   * The signed-in reader, when the site's devsforfun ID reader-auth is wired.
   * Null (the default) → read-only: counts show, reacting prompts sign-in. The
   * write path lights up once a reader session + a POST endpoint exist.
   */
  user?: { id: string; name?: string } | null;
};

const KINDS: { key: keyof Omit<Counts, 'total'>; label: string; glyph: string }[] = [
  { key: 'love', label: 'Love', glyph: '♥' }, // ♥
  { key: 'like', label: 'Like', glyph: '▲' }, // ▲
];

/**
 * Reaction badges (love/like) for a content item. Reads live counts from the
 * platform's public API; the love/like character colors + glow live in the
 * framework stylesheet (no hardcoded color in the component). Writing is gated
 * on the site's devsforfun ID reader-auth (see `user` prop).
 */
export function Reactions({ projectId, slug, apiBaseUrl = '', user = null }: Props) {
  const base = apiBaseUrl.replace(/\/$/, '');
  const [counts, setCounts] = React.useState<Counts | null>(null);
  const [gated, setGated] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    fetch(`${base}/api/v1/reactions?projectId=${encodeURIComponent(projectId)}&slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (live && b?.data) setCounts(b.data as Counts);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [base, projectId, slug]);

  function react() {
    if (!user) {
      setGated(true); // reader-auth not wired yet
      return;
    }
    // TODO(reader-auth): POST the toggle once a reader session + endpoint exist.
  }

  return (
    <div className="fw-reactions" aria-label="Reactions">
      {KINDS.map((k) => (
        <button
          key={k.key}
          type="button"
          className={`fw-reaction fw-reaction-${k.key}`}
          onClick={react}
          aria-label={k.label}
        >
          <span className="fw-reaction-glyph" aria-hidden>
            {k.glyph}
          </span>
          <span className="fw-reaction-count">{counts ? counts[k.key] : '–'}</span>
        </button>
      ))}
      {gated ? <span className="fw-reaction-gate">Sign in to react</span> : null}
    </div>
  );
}
