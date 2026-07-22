'use client';

import * as React from 'react';

/* TocHeading is defined here (source of truth) and re-exported from docs-shell */
export interface TocHeading {
  depth: number;
  text: string;
  slug: string;
}

/* ─────────────────────────────────────────────
   Mobile hamburger + drawer
───────────────────────────────────────────── */

/**
 * Thin client wrapper used by DocsShell to toggle the mobile sidebar drawer.
 * The sidebar content is passed as children so the server can render it.
 */
export function MobileSidebarToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Close on route change (navigation)
  React.useEffect(() => {
    setOpen(false);
  }, []);

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <button
        type="button"
        className="fw-hamburger"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="fw-hamburger-bar" />
        <span className="fw-hamburger-bar" />
        <span className="fw-hamburger-bar" />
      </button>

      {/* Backdrop */}
      {open ? (
        <div
          className="fw-sidebar-backdrop"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Drawer */}
      <div className={`fw-sidebar-drawer${open ? ' fw-sidebar-drawer--open' : ''}`} aria-hidden={!open}>
        {children}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Scroll-spy TocList
───────────────────────────────────────────── */

/**
 * Renders the TOC heading list with IntersectionObserver-based active
 * highlighting. The heading that is currently nearest the top of the viewport
 * gets data-active="true" on its <a> element.
 */
export function TocList({
  headings,
  title = 'On this page',
}: {
  headings: TocHeading[];
  title?: string;
}) {
  const [activeSlug, setActiveSlug] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (headings.length === 0) return;

    const elements = headings
      .map((h) => document.getElementById(h.slug))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    // Track which headings are intersecting and pick the topmost visible one.
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            visible.add(id);
          } else {
            visible.delete(id);
          }
        }
        // Pick the first heading (document order) that is visible
        const firstVisible = elements.find((el) => visible.has(el.id));
        if (firstVisible) {
          setActiveSlug(firstVisible.id);
        }
      },
      {
        rootMargin: '-64px 0px -40% 0px',
        threshold: 0,
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="fw-toc" aria-label="Table of contents">
      {title ? <p className="fw-toc-title">{title}</p> : null}
      <ul className="fw-toc-list">
        {headings.map((h) => (
          <li
            key={h.slug}
            className={`fw-toc-item fw-toc-depth-${h.depth}`}
          >
            <a
              href={`#${h.slug}`}
              className="fw-toc-link"
              data-active={activeSlug === h.slug ? 'true' : undefined}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
