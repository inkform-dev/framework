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
  projectId: string;
  slug: string;
  /** Platform origin hosting /api/v1/comments (e.g. https://freewritecms.com). */
  apiBaseUrl?: string;
  /** Signed-in reader (devsforfun ID reader-auth). Null → read-only + gated compose. */
  user?: { id: string; name?: string } | null;
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
 * Threaded comments for a content item. Reads the live nested tree from the
 * platform's public API and renders it as nested flat panels with hairline
 * indents. Posting is gated on the site's devsforfun ID reader-auth (`user`).
 */
export function Comments({ projectId, slug, apiBaseUrl = '', user = null }: Props) {
  const base = apiBaseUrl.replace(/\/$/, '');
  const [tree, setTree] = React.useState<CommentNode[] | null>(null);

  React.useEffect(() => {
    let live = true;
    fetch(`${base}/api/v1/comments?projectId=${encodeURIComponent(projectId)}&slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (live && Array.isArray(b?.data)) setTree(b.data as CommentNode[]);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [base, projectId, slug]);

  const count = tree ? countAll(tree) : 0;

  return (
    <section className="fw-comments" aria-label="Comments">
      <h3 className="fw-comments-title">
        {count} {count === 1 ? 'comment' : 'comments'}
      </h3>

      {/* Compose — gated until reader-auth ships. */}
      {user ? (
        <form className="fw-comment-compose" onSubmit={(e) => e.preventDefault()}>
          <textarea placeholder="Add a comment…" rows={3} />
          <button type="submit">Post</button>
        </form>
      ) : (
        <p className="fw-comment-gate">Sign in with devsforfun ID to comment.</p>
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
