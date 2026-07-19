import type { ScalarThemePalette } from '@inkform/framework/scalar-theme';

/**
 * Base's own light/dark palette, duplicated from app/theme.css's --fw-*
 * values (Scalar renders a separate document that can't read those CSS
 * variables — see scalar-theme.ts). No web fonts — pure system stack,
 * matching app/theme.css's "minimal, neutral, unopinionated" identity.
 */
export const baseScalarTheme: ScalarThemePalette = {
  light: {
    bg: '#ffffff',
    bgSubtle: '#f9fafb',
    card: '#ffffff',
    fg: '#111827',
    muted: '#6b7280',
    border: '#e5e7eb',
    primary: '#2563eb',
    primaryFg: '#ffffff',
    shadow: '2px 2px 0 rgba(17, 24, 39, 0.06)',
    shadowLg: '4px 4px 0 rgba(17, 24, 39, 0.08)',
  },
  dark: {
    bg: '#0d0d0d',
    bgSubtle: '#141414',
    card: '#141414',
    fg: '#f3f4f6',
    muted: '#9ca3af',
    border: '#222222',
    primary: '#60a5fa',
    primaryFg: '#0d0d0d',
    shadow: '2px 2px 0 rgba(0, 0, 0, 0.45)',
    shadowLg: '4px 4px 0 rgba(0, 0, 0, 0.65)',
  },
  radius: '8px',
  font: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, "Cascadia Code", Consolas, monospace',
};
