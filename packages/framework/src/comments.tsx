'use client';

import * as React from 'react';

export type CommentNode = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
  replies: CommentNode[];
};

type Props = {
  /** Project/site id passed through to your backend. Optional for single-site setups. */
  projectId?: string;
  slug: string;
  /**
   * Endpoint returning `{ data: CommentNode[] }` for `?projectId=&slug=`.
   * Bring your own backend — defaults to `/api/comments` on the same origin.
   */
  endpoint?: string;
  /** Convenience: prefix `/api/comments` with this origin (ignored if `endpoint` is set). */
  apiBaseUrl?: string;
  /** Signed-in reader. Null → read-only + gated compose. */
  user?: { id: string; name?: string } | null;
  /** Prompt shown when an anonymous reader tries to comment. */
  signInLabel?: string;
};

/** Recursively renders a comment and its replies (infinite nesting, flat panels). */
function Comment({ node }: { node: CommentNode }) {
  return (
    <li className="fw-comment">
      <div className="fw-comment-head">
        <span className="fw-comment-author">{node.authorName ?? 'Anonymous'}</span>
        <time className="fw-comment-date" dateTime={node.createdAt}>
          {new Date(node.createdAt).toLocaleDateString()}
        </time>
      </div>
      <p className="fw-comment-body">{node.body}</p>
      {node.replies.length > 0 ? (
        <ul className="fw-comment-replies">
          {node.replies.map((r) => (
            <Comment key={r.id} node={r} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Threaded comments for a content item. Reads the live nested tree from your
 * backend and renders it as nested flat panels with hairline indents. Posting
 * is gated on a signed-in `user` — wire your own reader auth to enable it.
 */
export function Comments({
  projectId,
  slug,
  endpoint,
  apiBaseUrl = '',
  user = null,
  signInLabel = 'Sign in to comment.',
}: Props) {
  const url = endpoint ?? `${apiBaseUrl.replace(/\/$/, '')}/api/comments`;
  const [tree, setTree] = React.useState<CommentNode[] | null>(null);

  React.useEffect(() => {
    let live = true;
    const q = new URLSearchParams();
    if (projectId) q.set('projectId', projectId);
    q.set('slug', slug);
    fetch(`${url}?${q.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (live && Array.isArray(b?.data)) setTree(b.data as CommentNode[]);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [url, projectId, slug]);

  const count = tree ? countAll(tree) : 0;

  return (
    <section className="fw-comments" aria-label="Comments">
      <h3 className="fw-comments-title">
        {count} {count === 1 ? 'comment' : 'comments'}
      </h3>

      {/* Compose — gated until reader auth is wired. */}
      {user ? (
        <form className="fw-comment-compose" onSubmit={(e) => e.preventDefault()}>
          <textarea placeholder="Add a comment…" rows={3} />
          <button type="submit">Post</button>
        </form>
      ) : (
        <p className="fw-comment-gate">{signInLabel}</p>
      )}

      {tree && tree.length > 0 ? (
        <ul className="fw-comment-list">
          {tree.map((n) => (
            <Comment key={n.id} node={n} />
          ))}
        </ul>
      ) : (
        <p className="fw-comments-empty">No comments yet.</p>
      )}
    </section>
  );
}

function countAll(nodes: CommentNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countAll(n.replies), 0);
}
