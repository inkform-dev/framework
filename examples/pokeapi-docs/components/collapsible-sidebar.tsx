'use client';

import * as React from 'react';
import type { ReactNode } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { SidebarGroup } from '@inkform/framework/docs-shell';

/**
 * Aurora's own sidebar — NOT the framework's shared `Sidebar` component.
 *
 * Verified directly on palm.mintlify.site (2026-07-21, both the "Get
 * Started" and "API Reference" tabs): the small arrow icon that sits next to
 * the sidebar's top heading collapses the ENTIRE sidebar, not one group at a
 * time — clicking it hides every group (confirmed: the whole `aside` column
 * disappeared and the content column reflowed to fill the space) and hovering
 * the second group's heading ("Essentials") revealed no per-group affordance
 * at all. There is no independently-collapsible-group feature on the real
 * site to reproduce. This component builds the real behavior instead: one
 * collapse/expand toggle for the whole nav column, with a real `useState`
 * behind it (not just a static arrow glyph) and a thin re-expand rail left
 * behind when collapsed, matching what the live site actually does.
 *
 * The framework's `Sidebar` (docs-shell.tsx) has no `collapsible` prop and
 * isn't parameterized for this, so rather than add one-theme-only state to a
 * component every other theme also renders, this reimplements the group/item
 * markup locally (identical `fw-sidebar-*` classes — same look for free) and
 * layers the collapse chrome on top. `groups`/`title` come from the same
 * `SidebarGroup[]` builders every theme already uses
 * (`sidebarForDoc`, `buildReferenceSidebarGroups`), so no duplicate data
 * shape is introduced.
 */

export interface CollapsibleSidebarProps {
  /** The active tab's own label, shown as the sidebar's own heading (mirrors Palm's "Get Started" / "API Reference" heading above the group list). */
  title: string;
  groups: SidebarGroup[];
  footer?: ReactNode;
}

export function CollapsibleSidebar({ title, groups, footer }: CollapsibleSidebarProps): ReactNode {
  const [collapsed, setCollapsed] = React.useState(false);

  if (collapsed) {
    return (
      <div className="fw-aurora-sidebar-rail">
        <button
          type="button"
          className="fw-aurora-sidebar-toggle"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <PanelLeftOpen size={15} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <aside className="fw-sidebar">
      <div className="fw-sidebar-header fw-aurora-sidebar-heading">
        <span className="fw-aurora-sidebar-heading-text">{title}</span>
        <button
          type="button"
          className="fw-aurora-sidebar-toggle"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <PanelLeftClose size={15} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      <nav className="fw-sidebar-nav" aria-label="Documentation navigation">
        {groups.map((g) => (
          <div key={g.group} className="fw-sidebar-group">
            <p className="fw-sidebar-group-label">
              {g.icon ? (
                <span className="fw-sidebar-group-icon" aria-hidden>
                  {g.icon}
                </span>
              ) : null}
              {g.group}
            </p>
            <ul className="fw-sidebar-items">
              {g.items.map((item) => (
                <li
                  key={item.href}
                  className={`fw-sidebar-item${item.active ? ' fw-sidebar-item--active' : ''}${item.depth ? ` fw-sidebar-depth-${item.depth}` : ''}`}
                >
                  <a
                    href={item.href}
                    className="fw-sidebar-link"
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    aria-current={item.active ? 'page' : undefined}
                  >
                    {item.icon ? (
                      <span className="fw-sidebar-item-icon" aria-hidden>
                        {item.icon}
                      </span>
                    ) : null}
                    <span className="fw-sidebar-item-title">{item.title}</span>
                    {item.external ? (
                      <span className="fw-sidebar-item-ext" aria-hidden>
                        ↗
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      {footer ? <div className="fw-sidebar-footer">{footer}</div> : null}
    </aside>
  );
}
