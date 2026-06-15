import type { ReactNode } from 'react';
import { MobileSidebarToggle, TocList as TocListClient } from './shell-client';
import type { TocHeading as TocHeadingBase } from './shell-client';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

/** Re-exported from shell-client (defined there to avoid circular imports) */
export type TocHeading = TocHeadingBase;

export interface SidebarItem {
  title: string;
  href: string;
  active?: boolean;
  icon?: ReactNode;
  external?: boolean;
  depth?: number;
}

export interface SidebarGroup {
  group: string;
  icon?: ReactNode;
  items: SidebarItem[];
}

/* ─────────────────────────────────────────────
   TocList — thin server wrapper around the client component.
   Callers import it from '@freewrite-cms/framework/docs-shell'.
───────────────────────────────────────────── */

export function TocList(props: { headings: TocHeading[]; title?: string }): ReactNode {
  return <TocListClient {...props} />;
}

/* ─────────────────────────────────────────────
   Sidebar
───────────────────────────────────────────── */

export function Sidebar({
  groups,
  header,
  footer,
}: {
  groups: SidebarGroup[];
  header?: ReactNode;
  footer?: ReactNode;
}): ReactNode {
  return (
    <aside className="fw-sidebar">
      {header ? <div className="fw-sidebar-header">{header}</div> : null}
      <nav className="fw-sidebar-nav" aria-label="Documentation navigation">
        {groups.map((g) => (
          <div key={g.group} className="fw-sidebar-group">
            <p className="fw-sidebar-group-label">
              {g.icon ? <span className="fw-sidebar-group-icon" aria-hidden>{g.icon}</span> : null}
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
                      <span className="fw-sidebar-item-ext" aria-hidden>↗</span>
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

/* ─────────────────────────────────────────────
   Pagination
───────────────────────────────────────────── */

export function Pagination({
  prev,
  next,
}: {
  prev?: { title: string; href: string } | null;
  next?: { title: string; href: string } | null;
}): ReactNode {
  if (!prev && !next) return null;
  return (
    <nav className="fw-pagination" aria-label="Page navigation">
      {prev ? (
        <a href={prev.href} className="fw-pagination-card fw-pagination-prev">
          <span className="fw-pagination-dir">← Previous</span>
          <span className="fw-pagination-title">{prev.title}</span>
        </a>
      ) : (
        <span className="fw-pagination-spacer" />
      )}
      {next ? (
        <a href={next.href} className="fw-pagination-card fw-pagination-next">
          <span className="fw-pagination-dir">Next →</span>
          <span className="fw-pagination-title">{next.title}</span>
        </a>
      ) : (
        <span className="fw-pagination-spacer" />
      )}
    </nav>
  );
}

/* ─────────────────────────────────────────────
   Breadcrumbs
───────────────────────────────────────────── */

export function Breadcrumbs({
  trail,
}: {
  trail: { label: string; href?: string }[];
}): ReactNode {
  return (
    <nav className="fw-breadcrumbs" aria-label="Breadcrumb">
      <ol className="fw-breadcrumbs-list">
        {trail.map((crumb, i) => (
          <li key={i} className="fw-breadcrumbs-item">
            {i < trail.length - 1 ? (
              <>
                {crumb.href ? (
                  <a href={crumb.href} className="fw-breadcrumbs-link">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="fw-breadcrumbs-link">{crumb.label}</span>
                )}
                <span className="fw-breadcrumbs-sep" aria-hidden>/</span>
              </>
            ) : (
              <span className="fw-breadcrumbs-current" aria-current="page">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ─────────────────────────────────────────────
   DocsShell — 3-zone layout
───────────────────────────────────────────── */

export interface DocsShellProps {
  logo?: ReactNode;
  topNav?: ReactNode;
  topActions?: ReactNode;
  sidebar?: ReactNode;
  toc?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  hideToc?: boolean;
  hideSidebar?: boolean;
}

export function DocsShell({
  logo,
  topNav,
  topActions,
  sidebar,
  toc,
  children,
  footer,
  hideToc,
  hideSidebar,
}: DocsShellProps): ReactNode {
  return (
    <div className={`fw-shell${hideSidebar ? ' fw-shell--no-sidebar' : ''}${hideToc ? ' fw-shell--no-toc' : ''}`}>
      {/* ── Top header ── */}
      <header className="fw-shell-header">
        <div className="fw-shell-header-inner">
          {/* Logo + mobile hamburger (hamburger wraps sidebar content for drawer) */}
          <div className="fw-shell-header-start">
            {logo ? <div className="fw-shell-logo">{logo}</div> : null}
            {/* Mobile drawer toggle — client component */}
            {!hideSidebar && sidebar ? (
              <MobileSidebarToggle>{sidebar}</MobileSidebarToggle>
            ) : null}
          </div>

          {/* Center nav */}
          {topNav ? (
            <nav className="fw-shell-topnav" aria-label="Top navigation">
              {topNav}
            </nav>
          ) : null}

          {/* Right actions */}
          {topActions ? (
            <div className="fw-shell-actions">{topActions}</div>
          ) : null}
        </div>
      </header>

      {/* ── Body (sidebar + content + toc) ── */}
      <div className="fw-shell-body">
        {/* Desktop sidebar */}
        {!hideSidebar && sidebar ? (
          <div className="fw-shell-sidebar">{sidebar}</div>
        ) : null}

        {/* Main content */}
        <main className="fw-shell-main" id="main-content">
          <div className="fw-shell-content">
            {children}
          </div>
        </main>

        {/* Right TOC rail */}
        {!hideToc && toc ? (
          <div className="fw-shell-toc">{toc}</div>
        ) : null}
      </div>

      {/* Footer */}
      {footer ? <footer className="fw-shell-footer">{footer}</footer> : null}
    </div>
  );
}
