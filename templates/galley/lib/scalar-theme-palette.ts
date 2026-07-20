import type { ScalarThemePalette } from '@inkform/framework/scalar-theme';

/**
 * Galley's own light/dark palette, duplicated from app/theme.css's --fw-*
 * values (Scalar renders a separate document that can't read those CSS
 * variables — see scalar-theme.ts). Font names are hardcoded to match
 * app/layout.tsx's next/font choices (Newsreader/JetBrains Mono) plus
 * General Sans (Fontshare, loaded via a <link> tag, out of next/font's
 * reach either way). Identical to the real Galley palette already extracted
 * for the hosted platform's own Scalar reference — see
 * cms/apps/inkform/lib/scalar-theme-palette.ts. Keep both in sync if
 * Galley's palette ever changes.
 */
export const galleyScalarTheme: ScalarThemePalette = {
  light: {
    bg: '#fcfbf7',
    bgSubtle: '#f6f4ed',
    card: '#f6f4ed',
    fg: '#191813',
    muted: '#8b8779',
    border: '#e4e0d4',
    primary: '#c24e3d',
    primaryFg: '#fcfbf7',
    shadow: '2px 2px 0 rgba(25, 24, 19, 0.06)',
    shadowLg: '4px 4px 0 rgba(25, 24, 19, 0.08)',
  },
  dark: {
    bg: '#131210',
    bgSubtle: '#1b1a17',
    card: '#1b1a17',
    fg: '#f2efe6',
    muted: '#7b776b',
    border: '#2f2d28',
    primary: '#c24e3d',
    primaryFg: '#fcfbf7',
    shadow: '2px 2px 0 rgba(0, 0, 0, 0.4)',
    shadowLg: '4px 4px 0 rgba(0, 0, 0, 0.5)',
  },
  radius: '10px',
  font: "'General Sans', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontHeading: "'Newsreader', Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
};
