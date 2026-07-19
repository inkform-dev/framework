/**
 * Maps a template's existing --fw-* palette (the handful of values every
 * theme.css already defines — see styles/tokens.css) onto Scalar's own
 * --scalar-* custom properties, as the `customCss` string for the
 * ApiReference() config.
 *
 * Scalar's route handler returns a fully separate HTML document (its own
 * <html>, not nested inside this app's layout.tsx), so the running page's
 * --fw-* CSS variables aren't in scope there — these values are duplicated
 * from each template's theme.css by design. Keep the two in sync when a
 * theme's palette changes; grep the template's `lib/scalar-theme-palette.ts`
 * (or wherever it calls buildScalarCustomCss) alongside theme.css edits.
 *
 * Variable names verified against scalar/scalar's own
 * packages/themes/src/base/variables.css and the installed
 * @scalar/nextjs-api-reference bundle — don't add a --scalar-* name here
 * without confirming it's real.
 */

export type ScalarThemeColors = {
  bg: string;
  bgSubtle: string;
  card: string;
  fg: string;
  muted: string;
  border: string;
  primary: string;
  primaryFg: string;
  /** Hard-offset shadow, e.g. '2px 2px 0 rgba(15,23,42,0.06)' (ui-guardrails: hard offset over blur). */
  shadow?: string;
  shadowLg?: string;
};

export type ScalarThemePalette = {
  light: ScalarThemeColors;
  dark: ScalarThemeColors;
  /** Base corner radius, e.g. '8px'. Scalar derives its -md/-lg/-xl/-full steps from this one value. */
  radius?: string;
  /** UI/body font stack. */
  font?: string;
  /** Prose heading font stack — Scalar has no dedicated variable for this, so it's applied via an h1-h6 rule. */
  fontHeading?: string;
  /** Code/monospace font stack. */
  mono?: string;
};

function colorVars(c: ScalarThemeColors): string {
  return `
    --scalar-background-1: ${c.bg};
    --scalar-background-2: ${c.bgSubtle};
    --scalar-background-3: ${c.card};
    --scalar-background-accent: color-mix(in srgb, ${c.primary} 8%, transparent);
    --scalar-border-color: ${c.border};
    --scalar-color-1: ${c.fg};
    --scalar-color-2: ${c.muted};
    --scalar-color-3: color-mix(in srgb, ${c.muted} 75%, transparent);
    --scalar-color-accent: ${c.primary};
    --scalar-button-1: ${c.primary};
    --scalar-button-1-color: ${c.primaryFg};
    --scalar-button-1-hover: color-mix(in srgb, ${c.primary} 90%, black 10%);
    --scalar-header-background-1: ${c.bg};
    --scalar-header-border-color: ${c.border};
    --scalar-header-color-1: ${c.fg};
    --scalar-header-color-2: ${c.muted};
    --scalar-header-call-to-action-color: ${c.primary};
    --scalar-scrollbar-color: ${c.border};
    --scalar-scrollbar-color-active: ${c.muted};
    --scalar-sidebar-background-1: ${c.bgSubtle};
    --scalar-sidebar-border-color: ${c.border};
    --scalar-sidebar-color-1: ${c.fg};
    --scalar-sidebar-color-2: ${c.muted};
    --scalar-sidebar-color-active: ${c.primary};
    --scalar-sidebar-indent-border: ${c.border};
    --scalar-sidebar-indent-border-active: ${c.primary};
    --scalar-sidebar-item-active-background: color-mix(in srgb, ${c.primary} 10%, transparent);
    --scalar-sidebar-item-hover-background: ${c.card};
    --scalar-sidebar-item-hover-color: ${c.fg};
    --scalar-sidebar-search-background: ${c.bg};
    --scalar-sidebar-search-border-color: ${c.border};
    --scalar-sidebar-search-color: ${c.muted};
    ${c.shadow ? `--scalar-shadow-1: ${c.shadow};` : ''}
    ${c.shadowLg ? `--scalar-shadow-2: ${c.shadowLg};` : ''}
  `;
}

export function buildScalarCustomCss(palette: ScalarThemePalette): string {
  const { light, dark, radius, font, mono, fontHeading } = palette;
  return `
.light-mode {${colorVars(light)}}
.dark-mode {${colorVars(dark)}}
:root {
  ${radius ? `--scalar-radius: ${radius};` : ''}
  ${font ? `--scalar-font: ${font};` : ''}
  ${mono ? `--scalar-font-code: ${mono};` : ''}
}
${fontHeading ? `h1, h2, h3, h4, h5, h6 { font-family: ${fontHeading}; }` : ''}
`;
}
