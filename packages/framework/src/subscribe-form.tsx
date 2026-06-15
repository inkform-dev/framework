'use client';

import * as React from 'react';

type Props = {
  projectId: string;
  /**
   * Endpoint that accepts `{ projectId, email, source }` and returns
   * `{ error? }`. Bring your own newsletter backend (Resend, ConvertKit,
   * Buttondown, …) — defaults to `/api/newsletter/subscribe` on this origin.
   */
  endpoint?: string;
  /** Convenience: prefix `/api/newsletter/subscribe` with this origin (ignored if `endpoint` is set). */
  apiBaseUrl?: string;
  source?: string;
  placeholder?: string;
  buttonLabel?: string;
};

/** Standalone subscribe form. Posts to your newsletter endpoint; no backend assumed. */
export function SubscribeForm({
  projectId,
  endpoint,
  apiBaseUrl = '',
  source = 'site',
  placeholder = 'you@example.com',
  buttonLabel = 'Subscribe',
}: Props) {
  const [email, setEmail] = React.useState('');
  const [state, setState] = React.useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState('loading');
    setError(null);
    try {
      const url = endpoint ?? `${apiBaseUrl.replace(/\/$/, '')}/api/newsletter/subscribe`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId, email: email.trim(), source }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Subscription failed');
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription failed');
      setState('error');
    }
  }

  if (state === 'done') return <p className="fw-subscribe-done">Thanks — you&rsquo;re subscribed.</p>;

  return (
    <form className="fw-subscribe" onSubmit={submit}>
      <input
        type="email"
        required
        value={email}
        placeholder={placeholder}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state === 'loading'}
      />
      <button type="submit" disabled={state === 'loading' || !email.trim()}>
        {state === 'loading' ? '…' : buttonLabel}
      </button>
      {error ? <p className="fw-subscribe-error">{error}</p> : null}
    </form>
  );
}
