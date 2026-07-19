import type { ScalarThemePalette } from '@inkform/framework/scalar-theme';

/**
 * Pokeapi-docs' own light/dark palette, duplicated from app/theme.css's
 * --fw-* values (Scalar renders a separate document that can't read those
 * CSS variables — see scalar-theme.ts). Font names hardcoded to match
 * app/layout.tsx's next/font choices (Inter/JetBrains Mono) — no separate
 * heading font, same as theme.css's --fw-font-heading choice.
 */
export const pokeapiScalarTheme: ScalarThemePalette = {
  light: {
    bg: '#ffffff',
    bgSubtle: '#f8f9fb',
    card: '#ffffff',
    fg: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
    primary: '#dc2626',
    primaryFg: '#ffffff',
    shadow: '2px 2px 0 rgba(15, 23, 42, 0.06)',
    shadowLg: '4px 4px 0 rgba(15, 23, 42, 0.08)',
  },
  dark: {
    bg: '#0a0a0b',
    bgSubtle: '#111114',
    card: '#111114',
    fg: '#e8eaf0',
    muted: '#8b9bb4',
    border: '#1e2230',
    primary: '#f87171',
    primaryFg: '#0a0a0b',
    shadow: '2px 2px 0 rgba(0, 0, 0, 0.4)',
    shadowLg: '4px 4px 0 rgba(0, 0, 0, 0.6)',
  },
  radius: '8px',
  font: 'Inter, ui-sans-serif, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
};
