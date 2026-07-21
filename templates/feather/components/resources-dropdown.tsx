'use client';

import * as React from 'react';
import { ChevronDown, Newspaper, History, Users, type LucideIcon } from 'lucide-react';

/**
 * "Resources" — Feather's third top-nav tab, a dropdown instead of a plain
 * link (matches Luma's own header: Guides / API Reference / Resources ⌄).
 *
 * This is deliberately NOT a new `DocsTab` variant in the shared framework.
 * `packages/framework/src/nav.ts`'s `DocsTab` is either a nav-group tab or
 * an OpenAPI tab — every entry in `docTabs(config)` renders as a plain link
 * (see top-bar.tsx's `TabNav`). A dropdown tab is a different UI concept
 * (open/close state, a menu panel, click-outside/Escape handling) that no
 * other shipped theme needs yet, so per the task brief this stays a
 * per-theme, UI-only construct: a static list of links hand-built here,
 * not sourced from docs.json. If a second theme ever wants the same
 * pattern, promoting a `DropdownTab` shape into `nav.ts` + a shared
 * component would be the point to do it — not before (rule of three).
 */

type ResourceItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const RESOURCES_ITEMS: ResourceItem[] = [
  { label: 'Changelog', description: 'Latest updates and releases', href: '/changelog', icon: History },
  { label: 'Blog', description: 'Articles and tutorials', href: '/blog', icon: Newspaper },
  {
    label: 'Community',
    description: 'Discuss topics with other developers',
    href: 'https://github.com/inkform-dev/framework/discussions',
    icon: Users,
  },
];

export function ResourcesTab() {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
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

  return (
    <div className="fw-resources-tab" ref={rootRef}>
      <button
        type="button"
        className="fw-resources-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Resources
        <ChevronDown size={14} strokeWidth={2} className="fw-resources-chevron" aria-hidden />
      </button>
      {open ? (
        <div className="fw-resources-menu" role="menu">
          {RESOURCES_ITEMS.map((item) => {
            const Icon = item.icon;
            const external = item.href.startsWith('http');
            return (
              <a
                key={item.href}
                href={item.href}
                role="menuitem"
                className="fw-resources-menu-item"
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon size={16} strokeWidth={1.75} className="fw-resources-menu-icon" />
                <span>
                  <span className="fw-resources-menu-label">{item.label}</span>
                  <span className="fw-resources-menu-desc">{item.description}</span>
                </span>
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
