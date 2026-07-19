import type { ScalarThemePalette } from '@inkform/framework/scalar-theme';

/**
 * Markdown-docs' own light/dark palette, duplicated from app/theme.css's
 * --fw-* values (Scalar renders a separate document that can't read those
 * CSS variables — see scalar-theme.ts). This example has no OpenAPI spec
 * configured in docs.json yet, so the /api-reference route 404s until one
 * is added — this palette is here so theming is correct the moment it is.
 */
export const markdownDocsScalarTheme: ScalarThemePalette = {
  light: {
    bg: '#ffffff',
    bgSubtle: '#f5f5f5',
    card: '#ffffff',
    fg: '#0a0a0a',
    muted: '#5a5a5a',
    border: '#d0d0d0',
    primary: '#1a9e5c',
    primaryFg: '#ffffff',
    shadow: '2px 2px 0 rgba(0, 0, 0, 0.18)',
    shadowLg: '4px 4px 0 rgba(0, 0, 0, 0.22)',
  },
  dark: {
    bg: '#0a0a0a',
    bgSubtle: '#0e0e0e',
    card: '#0e0e0e',
    fg: '#e8e8e8',
    muted: '#7a7a7a',
    border: '#2a2a2a',
    primary: '#22c46e',
    primaryFg: '#0a0a0a',
    shadow: '2px 2px 0 rgba(0, 0, 0, 0.7)',
    shadowLg: '4px 4px 0 rgba(0, 0, 0, 0.9)',
  },
  radius: '0px',
  font: '"JetBrains Mono", ui-monospace, Consolas, monospace',
  fontHeading: '"JetBrains Mono", ui-monospace, Consolas, monospace',
  mono: '"JetBrains Mono", ui-monospace, Consolas, monospace',
};
