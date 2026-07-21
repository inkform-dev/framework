'use client';

import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface LanguageSwitcherProps {
  label?: string;
}

/**
 * Visual-only language switcher for the sidebar footer (the reference
 * site's own "English ▾" control — confirmed by opening it there: it lists
 * exactly one, already-checked, locale). No i18n is wired up — Rowan ships
 * a single locale, same as the reference; this renders the affordance
 * without pretending to switch anything real.
 */
export function LanguageSwitcher({ label = 'English' }: LanguageSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="fw-lang-switcher" ref={rootRef}>
      <button
        type="button"
        className="fw-lang-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{label}</span>
        <ChevronDown size={14} strokeWidth={1.75} />
      </button>
      {open ? (
        <ul className="fw-lang-switcher-menu" role="listbox">
          <li role="option" aria-selected="true" className="fw-lang-switcher-item fw-lang-switcher-item--active">
            <Check size={14} strokeWidth={1.75} />
            <span>{label}</span>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
