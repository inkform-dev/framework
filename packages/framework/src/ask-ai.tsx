'use client';

import * as React from 'react';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface AskAiProps {
  enabled?: boolean;
  endpoint?: string;
  label?: string;
  placeholder?: string;
  product?: string;
}

type AskSource = {
  type: 'doc' | 'operation';
  title: string;
  id: string;
  href: string;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: AskSource[];
};

/* ─────────────────────────────────────────────
   AskAi
───────────────────────────────────────────── */

export function AskAi({
  enabled = false,
  endpoint = '/api/ask',
  label = 'Ask AI',
  placeholder = 'Ask a question…',
  product,
}: AskAiProps): React.ReactNode {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus input when opened
  React.useEffect(() => {
    if (open && enabled) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, enabled]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !enabled || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const body = await res.json().catch(() => null);
      let reply: string;
      let sources: AskSource[] | undefined;

      if (body && typeof body === 'object' && 'text' in body) {
        reply = String(body.text);
        if ('sources' in body && Array.isArray(body.sources)) {
          sources = body.sources as AskSource[];
        }
      } else if (typeof body === 'string') {
        reply = body;
      } else {
        reply = 'Sorry, I could not parse the response.';
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: reply, sources }]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${errMsg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  const greeting = product
    ? `Hi! I'm the ${product} AI assistant. Ask me anything about the documentation.`
    : `Hi! I'm your AI documentation assistant. Ask me anything.`;

  return (
    <>
      {/* Trigger pill */}
      <button
        type="button"
        className="fw-askai-trigger"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="fw-askai-trigger-icon" aria-hidden>
          ✦
        </span>
        <span className="fw-askai-trigger-label">{label}</span>
      </button>

      {/* Panel */}
      {open ? (
        <>
          {/* Backdrop */}
          <div
            className="fw-askai-backdrop"
            aria-hidden
            onClick={() => setOpen(false)}
          />

          {/* Side panel / drawer */}
          <aside
            className="fw-askai-panel"
            role="dialog"
            aria-modal
            aria-label="AI Assistant"
          >
            {/* Panel header */}
            <div className="fw-askai-panel-header">
              <div className="fw-askai-panel-title">
                <span className="fw-askai-icon" aria-hidden>✦</span>
                <span>{label}</span>
              </div>
              <button
                type="button"
                className="fw-askai-close"
                onClick={() => setOpen(false)}
                aria-label="Close AI assistant"
              >
                ✕
              </button>
            </div>

            {/* Message list */}
            <div className="fw-askai-messages" role="log" aria-live="polite" aria-relevant="additions">
              {/* Greeting */}
              {messages.length === 0 ? (
                <div className="fw-askai-greeting">
                  <div className="fw-askai-greeting-icon" aria-hidden>✦</div>
                  <p className="fw-askai-greeting-text">{greeting}</p>
                </div>
              ) : null}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`fw-askai-message fw-askai-message--${m.role}`}
                >
                  <span className="fw-askai-message-role" aria-hidden>
                    {m.role === 'user' ? 'You' : 'AI'}
                  </span>
                  <div className="fw-askai-message-content">{m.content}</div>
                  {m.sources && m.sources.length > 0 ? (
                    <ul className="fw-askai-sources">
                      {m.sources.map((s) => (
                        <li key={`${s.type}-${s.id}`}>
                          <a href={s.href} className="fw-askai-source-link">
                            <span className={`fw-askai-source-kind fw-askai-source-kind--${s.type}`}>
                              {s.type === 'operation' ? 'API' : 'Docs'}
                            </span>
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}

              {loading ? (
                <div className="fw-askai-message fw-askai-message--assistant fw-askai-message--loading">
                  <span className="fw-askai-message-role" aria-hidden>AI</span>
                  <div className="fw-askai-loading-dots" aria-label="Thinking">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            {/* Disabled state notice */}
            {!enabled ? (
              <div className="fw-askai-disabled-notice" role="status">
                <span className="fw-askai-disabled-icon" aria-hidden>⚠</span>
                <div>
                  <p className="fw-askai-disabled-title">AI assistant is coming soon</p>
                  <p className="fw-askai-disabled-hint">
                    Set{' '}
                    <code>NEXT_PUBLIC_DOCS_AI_ENABLED=true</code>{' '}
                    to enable the AI assistant.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Input area */}
            <div className="fw-askai-input-area">
              <textarea
                ref={inputRef}
                className="fw-askai-input"
                placeholder={enabled ? placeholder : 'AI assistant is disabled'}
                value={input}
                rows={2}
                disabled={!enabled || loading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Your question"
              />
              <button
                type="button"
                className="fw-askai-send"
                onClick={() => void sendMessage()}
                disabled={!enabled || loading || !input.trim()}
                aria-label="Send"
              >
                ↑
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
