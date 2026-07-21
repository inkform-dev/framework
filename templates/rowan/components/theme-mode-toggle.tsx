'use client';

import * as React from 'react';
import { Monitor, Sun, Moon } from 'lucide-react';

type Mode = 'system' | 'light' | 'dark';

/** Same key @inkform/framework/theme-toggle's themeInitScript reads on first paint. */
const STORAGE_KEY = 'fw-theme';

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readMode(): Mode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // localStorage unavailable (private mode, disabled) — fall through to 'system'.
  }
  return 'system';
}

function applyMode(mode: Mode) {
  const dark = mode === 'dark' || (mode === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  try {
    if (mode === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Best-effort persistence only — the toggle still works for this tab.
  }
}

/**
 * Rowan's minimal-chrome theme control — a 3-way system/light/dark segmented
 * toggle (the icon cluster on the reference site), replacing the
 * framework's 2-state <ThemeToggle> for this theme only. Reuses the same
 * localStorage key + `dark` class/data-theme convention as
 * @inkform/framework/theme-toggle's themeInitScript (still injected in
 * app/layout.tsx), so the no-flash init script and this control never
 * disagree about how state is stored — "system" just means "no override
 * stored," not a third persisted value.
 */
export function ThemeModeToggle() {
  const [mode, setMode] = React.useState<Mode>('system');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMode(readMode());
    setMounted(true);
  }, []);

  // While in "system" mode, follow live OS theme changes instead of only
  // resolving once on click.
  React.useEffect(() => {
    if (!mounted || mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyMode('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mounted, mode]);

  function choose(next: Mode) {
    setMode(next);
    applyMode(next);
  }

  if (!mounted) {
    return <div className="fw-mode-toggle" aria-hidden />;
  }

  const options: { value: Mode; label: string; Icon: typeof Monitor }[] = [
    { value: 'system', label: 'Use system theme', Icon: Monitor },
    { value: 'light', label: 'Light theme', Icon: Sun },
    { value: 'dark', label: 'Dark theme', Icon: Moon },
  ];

  return (
    <div className="fw-mode-toggle" role="radiogroup" aria-label="Theme">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          aria-label={label}
          title={label}
          className={`fw-mode-toggle-btn${mode === value ? ' fw-mode-toggle-btn--active' : ''}`}
          onClick={() => choose(value)}
        >
          <Icon size={14} strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}
