'use client';

import * as React from 'react';
import { Monitor, Sun, Moon, ChevronDown } from 'lucide-react';

/**
 * Sidebar-bottom widget: language label + a system/light/dark theme trio.
 * Verified directly on palm.mintlify.site: the sidebar footer shows
 * "English ⌄" beside three icon buttons whose accessible names are "Switch
 * to system/light/dark theme" — not the framework's single light/dark
 * `ThemeToggle` button (which Canopy doesn't render in the header at all, to
 * match Palm's real header, which has no theme control up top).
 *
 * Reuses the exact same contract the framework's own `themeInitScript` /
 * `ThemeToggle` read and write (`localStorage['fw-theme']` + the `dark`
 * class + `data-theme` attribute on <html>), just with a third "system"
 * state layered on top: "system" means no stored override, which is already
 * what themeInitScript falls back to via `prefers-color-scheme` — so this
 * doesn't need any shared framework change to stay in sync on first paint.
 */

type ThemePref = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'fw-theme';
const PREF_EVENT = 'fw-theme-pref-change';

function readStoredPref(): ThemePref {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* localStorage unavailable — fall through to 'system' */
  }
  return 'system';
}

function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  const isDark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  try {
    if (pref === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* localStorage unavailable — theme still applies for this page load */
  }
  window.dispatchEvent(new CustomEvent<ThemePref>(PREF_EVENT, { detail: pref }));
}

function ThemeTrio() {
  const [pref, setPref] = React.useState<ThemePref>('system');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setPref(readStoredPref());
    setMounted(true);

    // Two sidebar instances mount at once (desktop aside + mobile drawer —
    // DocsShell renders the `sidebar` prop into both); keep them in sync
    // without a shared store.
    function onExternalChange(e: Event) {
      setPref((e as CustomEvent<ThemePref>).detail);
    }
    window.addEventListener(PREF_EVENT, onExternalChange);
    return () => window.removeEventListener(PREF_EVENT, onExternalChange);
  }, []);

  React.useEffect(() => {
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  function choose(next: ThemePref) {
    setPref(next);
    applyTheme(next);
  }

  return (
    <div className="fw-canopy-theme-trio" role="group" aria-label="Theme preference">
      <button
        type="button"
        aria-label="Switch to system theme"
        aria-pressed={mounted && pref === 'system'}
        onClick={() => choose('system')}
      >
        <Monitor size={14} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-label="Switch to light theme"
        aria-pressed={mounted && pref === 'light'}
        onClick={() => choose('light')}
      >
        <Sun size={14} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-label="Switch to dark theme"
        aria-pressed={mounted && pref === 'dark'}
        onClick={() => choose('dark')}
      >
        <Moon size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

/** Real open/close state, honestly scoped: the framework has no i18n, so the menu's only entry is the language already in use. */
function LanguageMenu() {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="fw-canopy-lang" ref={rootRef}>
      <button
        type="button"
        className="fw-canopy-lang-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        English
        <ChevronDown size={13} strokeWidth={1.75} />
      </button>
      {open ? (
        <div className="fw-canopy-lang-menu" role="menu">
          <button type="button" role="menuitemradio" aria-checked="true" className="fw-canopy-lang-option" onClick={() => setOpen(false)}>
            English
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SidebarFooter() {
  return (
    <div className="fw-canopy-sidebar-footer">
      <LanguageMenu />
      <ThemeTrio />
    </div>
  );
}
