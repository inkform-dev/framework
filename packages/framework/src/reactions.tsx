'use client';

import * as React from 'react';

type Counts = { love: number; like: number; total: number };

type Props = {
  /** Project/site id passed through to your backend. Optional for single-site setups. */
  projectId?: string;
  /** Content item id (post/page/entry slug). */
  slug: string;
  /**
   * Endpoint that returns `{ data: { love, like, total } }` for the given
   * `?projectId=&slug=` query. Bring your own backend — defaults to
   * `/api/reactions` on the same origin.
   */
  endpoint?: string;
  /** Convenience: prefix `/api/reactions` with this origin (ignored if `endpoint` is set). */
  apiBaseUrl?: string;
  /** The signed-in reader, when your site has reader auth. Null → read-only. */
  user?: { id: string; name?: string } | null;
  /** Prompt shown when an anonymous reader tries to react. */
  signInLabel?: string;
};

const KINDS: { key: keyof Omit<Counts, 'total'>; label: string; glyph: string }[] = [
  { key: 'love', label: 'Love', glyph: '♥' },
  { key: 'like', label: 'Like', glyph: '▲' },
];

/**
 * Reaction badges (love/like) for a content item. Reads live counts from your
 * backend; the colors + glow live in the framework stylesheet (no hardcoded
 * color in the component). Reacting is gated on a signed-in `user` — wire your
 * own reader auth + a POST endpoint to enable writes.
 */
export function Reactions({
  projectId,
  slug,
  endpoint,
  apiBaseUrl = '',
  user = null,
  signInLabel = 'Sign in to react',
}: Props) {
  const url = endpoint ?? `${apiBaseUrl.replace(/\/$/, '')}/api/reactions`;
  const [counts, setCounts] = React.useState<Counts | null>(null);
  const [gated, setGated] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    const q = new URLSearchParams();
    if (projectId) q.set('projectId', projectId);
    q.set('slug', slug);
    fetch(`${url}?${q.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (live && b?.data) setCounts(b.data as Counts);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [url, projectId, slug]);

  function react() {
    if (!user) {
      setGated(true);
      return;
    }
    // Wire your POST toggle here once a reader session + endpoint exist.
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
      {gated ? <span className="fw-reaction-gate">{signInLabel}</span> : null}
    </div>
  );
}
