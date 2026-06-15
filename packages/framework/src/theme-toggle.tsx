'use client';

import * as React from 'react';

/* ─────────────────────────────────────────────
   themeInitScript
   Injected into <head> before any paint to set the
   correct theme class without a flash.
───────────────────────────────────────────── */

export const themeInitScript: string = `(function(){try{var s=localStorage.getItem('fw-theme');if(s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`;

/* ─────────────────────────────────────────────
   ThemeToggle
───────────────────────────────────────────── */

export function ThemeToggle({ className }: { className?: string } = {}): React.ReactNode {
  const [dark, setDark] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Read initial state on mount to avoid SSR mismatch
  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('fw-theme', 'dark'); } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      try { localStorage.setItem('fw-theme', 'light'); } catch {}
    }
  }

  // Render a placeholder before mount to match server output
  if (!mounted) {
    return (
      <button
        type="button"
        className={`fw-theme-toggle${className ? ` ${className}` : ''}`}
        aria-label="Toggle theme"
        aria-pressed={false}
      >
        <span className="fw-theme-toggle-icon" aria-hidden>☀</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`fw-theme-toggle${className ? ` ${className}` : ''}`}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={dark}
      onClick={toggle}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      <span className="fw-theme-toggle-icon" aria-hidden>
        {dark ? '☀' : '☾'}
      </span>
    </button>
  );
}
