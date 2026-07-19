import type { ScalarThemePalette } from '@inkform/framework/scalar-theme';

/**
 * Fern's own light/dark palette, duplicated from app/theme.css's --fw-*
 * values (Scalar renders a separate document that can't read those CSS
 * variables — see scalar-theme.ts). Font names are hardcoded to match
 * app/layout.tsx's next/font choices (Inter/Newsreader/JetBrains Mono),
 * since --font-sans/--font-heading/--font-mono are also out of scope there.
 */
export const fernScalarTheme: ScalarThemePalette = {
  light: {
    bg: '#ffffff',
    bgSubtle: '#f3faf5',
    card: '#ffffff',
    fg: '#0d1f14',
    muted: '#5a7566',
    border: '#d4ead9',
    primary: '#16a34a',
    primaryFg: '#ffffff',
    shadow: '2px 2px 0 rgba(13, 31, 20, 0.06)',
    shadowLg: '4px 4px 0 rgba(13, 31, 20, 0.09)',
  },
  dark: {
    bg: '#0b0f0d',
    bgSubtle: '#0f1510',
    card: '#0f1510',
    fg: '#e2f0e6',
    muted: '#7aaa89',
    border: '#1a2d1e',
    primary: '#34d399',
    primaryFg: '#0b0f0d',
    shadow: '2px 2px 0 rgba(0, 0, 0, 0.45)',
    shadowLg: '4px 4px 0 rgba(0, 0, 0, 0.65)',
  },
  radius: '14px',
  font: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontHeading: 'Newsreader, ui-serif, Georgia, "Times New Roman", serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
};
