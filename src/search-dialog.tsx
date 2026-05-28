'use client';

import * as React from 'react';
import Fuse from 'fuse.js';
import type { SearchDoc } from './search';

/**
 * Cmd+K search dialog. Loads the build-time index and runs fuse.js fuzzy
 * search client-side. Selecting a result navigates to its URL.
 */
export function SearchDialog({ index, placeholder = 'Search…' }: { index: SearchDoc[]; placeholder?: string }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const fuse = React.useMemo(
    () => new Fuse(index, { keys: ['title', 'excerpt'], threshold: 0.4, ignoreLocation: true }),
    [index],
  );

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);
  React.useEffect(() => setActive(0), [q]);

  const results = React.useMemo(() => {
    if (!q.trim()) return index.slice(0, 8);
    return fuse.search(q).slice(0, 12).map((r) => r.item);
  }, [q, fuse, index]);

  return (
    <>
      <button type="button" className="fw-search-trigger" onClick={() => setOpen(true)} aria-label="Search">
        Search <kbd>⌘K</kbd>
      </button>
      {open ? (
        <div className="fw-search-overlay" role="dialog" aria-modal onClick={() => setOpen(false)}>
          <div className="fw-search-panel" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              className="fw-search-input"
              value={q}
              placeholder={placeholder}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, results.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === 'Enter' && results[active]) {
                  window.location.href = results[active].url;
                }
              }}
            />
            <ul className="fw-search-results">
              {results.length === 0 ? (
                <li className="fw-search-empty">No results for “{q}”</li>
              ) : (
                results.map((r, i) => (
                  <li key={r.url}>
                    <a href={r.url} data-active={i === active} onMouseEnter={() => setActive(i)}>
                      <span className="fw-search-result-title">{r.title}</span>
                      <span className="fw-search-result-slug">
                        {r.section} · {r.url}
                      </span>
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
