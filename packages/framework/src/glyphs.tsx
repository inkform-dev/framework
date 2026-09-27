import * as React from 'react';

/**
 * Shared dependency-free stroke glyphs used by the AI-tool menu, page
 * actions, and the Mermaid diagram toolbar. Single-color
 * `currentColor` strokes, sized to match the menu's 15px icon slots.
 */

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function CopyGlyph() {
  return (
    <Glyph>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Glyph>
  );
}

export function CheckGlyph() {
  return (
    <Glyph>
      <path d="M20 6 9 17l-5-5" />
    </Glyph>
  );
}

export function ExternalGlyph() {
  return (
    <Glyph>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </Glyph>
  );
}

export function TextGlyph() {
  return (
    <Glyph>
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </Glyph>
  );
}

export function PlusGlyph() {
  return (
    <Glyph>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Glyph>
  );
}

export function MinusGlyph() {
  return (
    <Glyph>
      <path d="M5 12h14" />
    </Glyph>
  );
}

/** Four inward corners — "fit to view". */
export function FitGlyph() {
  return (
    <Glyph>
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </Glyph>
  );
}

/** Four outward corners — "expand to fullscreen". */
export function ExpandGlyph() {
  return (
    <Glyph>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </Glyph>
  );
}

export function DownloadGlyph() {
  return (
    <Glyph>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </Glyph>
  );
}

export function CloseGlyph() {
  return (
    <Glyph>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Glyph>
  );
}
