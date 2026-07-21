'use client';

/**
 * components/section-switcher.tsx — Folio's dropdown section switcher.
 *
 * Replaces the pill-row `TabNav` every other theme uses. Willow shows the
 * active tab's label as a single button ("GET STARTED ⌄") next to the logo;
 * clicking it opens a small menu listing every tab, with a checkmark next to
 * the active one.
 *
 * Takes a plain `items` prop (already resolved to { tab, href }) rather than
 * a `DocsConfig` + doing the docTabs()/apiBasePath() lookup itself — a real
 * build error surfaced why: apiBasePath lives in lib/route.tsx alongside
 * fs-backed loaders (loadDocsConfig et al. from @inkform/framework/content).
 * Importing ANYTHING from that module here, a 'use client' component, pulls
 * the whole module — including its top-level `node:fs` import — into the
 * client bundle ("the chunking context does not support external modules
 * (request: node:fs)"). top-bar.tsx (a server component) resolves the hrefs
 * and passes plain, serializable data down instead.
 */

import { useEffect, useRef, useState } from 'react';

export interface SectionSwitcherItem {
  tab: string;
  href: string;
}

export function SectionSwitcher({
  items,
  activeTab,
}: {
  items: SectionSwitcherItem[];
  activeTab: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape — the menu is a lightweight popover, not
  // a modal, so it should behave like one (no backdrop, no focus trap).
  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // A single tab has nothing to switch to — render nothing rather than a
  // dropdown of one.
  if (items.length <= 1) return null;

  return (
    <div className="fw-switcher" ref={rootRef}>
      <button
        type="button"
        className="fw-switcher-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="fw-switcher-label">{activeTab}</span>
        <span className={`fw-switcher-chevron${open ? ' fw-switcher-chevron--open' : ''}`} aria-hidden>
          ⌄
        </span>
      </button>

      {open ? (
        <ul className="fw-switcher-menu" role="listbox" aria-label="Sections">
          {items.map((item) => {
            const isActive = item.tab === activeTab;
            return (
              <li key={item.tab} role="presentation">
                <a
                  href={item.href}
                  role="option"
                  aria-selected={isActive}
                  className={`fw-switcher-item${isActive ? ' fw-switcher-item--active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="fw-switcher-item-label">{item.tab}</span>
                  {isActive ? (
                    <span className="fw-switcher-check" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
