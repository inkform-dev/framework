import type { ScalarThemePalette } from '@inkform/framework/scalar-theme';

/**
 * Cedar's own light/dark palette, duplicated from app/theme.css's --fw-*
 * values (Scalar renders a separate document that can't read those CSS
 * variables — see scalar-theme.ts). Font names are hardcoded to match
 * app/layout.tsx's next/font choices (Inter/Source Serif 4/JetBrains Mono),
 * since --font-sans/--font-heading/--font-mono are also out of scope there.
 */
export const cedarScalarTheme: ScalarThemePalette = {
  light: {
    bg: '#fffaf4',
    bgSubtle: '#fdf4e9',
    card: '#fffaf4',
    fg: '#2d1f0e',
    muted: '#7a5c3e',
    border: '#e8d9c4',
    primary: '#ea580c',
    primaryFg: '#ffffff',
    shadow: '2px 2px 0 rgba(45, 31, 14, 0.07)',
    shadowLg: '4px 4px 0 rgba(45, 31, 14, 0.10)',
  },
  dark: {
    bg: '#17120e',
    bgSubtle: '#1c1611',
    card: '#1c1611',
    fg: '#f2e8d9',
    muted: '#a8896a',
    border: '#2c2219',
    primary: '#fb923c',
    primaryFg: '#17120e',
    shadow: '2px 2px 0 rgba(0, 0, 0, 0.45)',
    shadowLg: '4px 4px 0 rgba(0, 0, 0, 0.65)',
  },
  radius: '10px',
  font: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontHeading: '"Source Serif 4", ui-serif, Georgia, "Times New Roman", serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
};
