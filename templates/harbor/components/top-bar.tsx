import type { ReactNode } from 'react';
import Link from 'next/link';
import { AskAi } from '@inkform/framework/ask-ai';
import { ThemeToggle } from '@inkform/framework/theme-toggle';
import { SearchDialog } from '@inkform/framework/search-dialog';
import type { DocsConfig } from '@inkform/framework';
import { docTabs } from '@inkform/framework';
import { loadDocsConfig } from '@inkform/framework/content';
import { apiBasePath } from '@/lib/route';

// ── Brand logo ────────────────────────────────────────────────────────────────

function Logo({ config }: { config: DocsConfig }) {
  const logo =
    typeof config.logo === 'string'
      ? config.logo
      : config.logo?.dark ?? config.logo?.light ?? null;

  return (
    <Link href="/" className="fw-shell-brand" aria-label={`${config.name} home`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={config.name} height={24} className="fw-shell-brand-logo" />
      ) : (
        <span className="fw-shell-brand-name">{config.name}</span>
      )}
    </Link>
  );
}

// ── Tab nav ───────────────────────────────────────────────────────────────────

function TabNav({ config, activeTab }: { config: DocsConfig; activeTab: string }) {
  const tabs = docTabs(config);
  const apiBase = apiBasePath(config);

  return (
    <div className="fw-topnav-tabs">
      {tabs.map((t) => {
        const href = t.openapi && apiBase ? `/${apiBase}` : '/';
        const isActive = t.tab === activeTab;
        return (
          <a
            key={t.tab}
            href={href}
            className={`fw-topnav-tab${isActive ? ' fw-topnav-tab--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {t.tab}
          </a>
        );
      })}
    </div>
  );
}

// ── Anchor links ──────────────────────────────────────────────────────────────

function AnchorLinks({ config }: { config: DocsConfig }) {
  const anchors = config.anchors ?? [];
  if (anchors.length === 0) return null;
  return (
    <div className="fw-topnav-anchors">
      {anchors.map((a) => (
        <a
          key={a.href}
          href={a.href}
          className="fw-topnav-anchor"
          target={a.href.startsWith('http') ? '_blank' : undefined}
          rel={a.href.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {a.name}
        </a>
      ))}
    </div>
  );
}

// ── Auth buttons (Harbor-specific) ──────────────────────────────────────────
//
// almond.mintlify.site (this theme's reference) shows a SaaS-product
// "Login" (ghost) + "Sign up" (solid) pair in the header instead of a
// single docs.json-driven `cta`. DocsConfig has no field for a two-button
// auth pair (only `cta: { label, href }`, one button) — adding a Harbor-only
// config extension for two hrefs would be more machinery than this needs,
// so — per this theme's own judgment call — the hrefs below are hardcoded
// placeholders rather than config-driven. Point them at real auth routes
// when wiring this theme to a real app. Harbor's docs.json has no `cta`
// field at all (removed — it would otherwise be dead config nothing reads).

const LOGIN_HREF = 'https://example.com/login';
const SIGNUP_HREF = 'https://example.com/signup';

function AuthButtons() {
  return (
    <div className="fw-harbor-auth">
      <a href={LOGIN_HREF} className="fw-harbor-login">
        Login
      </a>
      <a href={SIGNUP_HREF} className="fw-harbor-signup">
        Sign up
      </a>
    </div>
  );
}

// ── Top bar props ─────────────────────────────────────────────────────────────

export interface TopBarParts {
  logo: ReactNode;
  topNav: ReactNode;
  topActions: ReactNode;
  /**
   * Harbor-specific: content for <Sidebar>'s own `header` slot — the search
   * trigger. Passed from app/[[...slug]]/page.tsx and
   * app/api-reference/[[...slug]]/page.tsx, NOT rendered in topActions like
   * every other template's search trigger. See theme.css's "sidebar-embedded
   * search" comment for why.
   */
  sidebarHeader: ReactNode;
}

/**
 * Build the DocsShell header slot contents for Harbor.
 * Server component — client islands (SearchDialog, ThemeToggle, AskAi) are
 * already marked 'use client' in the framework.
 */
export function buildTopBar(config: DocsConfig, activeTab: string): TopBarParts {
  const aiEnabled = process.env.NEXT_PUBLIC_DOCS_AI_ENABLED === 'true';

  const logo = <Logo config={config} />;

  const topNav = (
    <>
      <TabNav config={config} activeTab={activeTab} />
      <AnchorLinks config={config} />
      {(config.navbarLinks ?? []).map((l) => (
        <a
          key={l.href}
          href={l.href}
          className="fw-topnav-navlink"
          target={l.href.startsWith('http') ? '_blank' : undefined}
          rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {l.name}
        </a>
      ))}
    </>
  );

  // No SearchDialog and no single CTA here — Harbor's two headline
  // differences from every other template: search lives in the sidebar
  // header (via `sidebarHeader` below) and the CTA is a Login/Sign-up pair.
  const topActions = (
    <>
      <ThemeToggle />
      <AskAi enabled={aiEnabled} product={config.name} />
      <AuthButtons />
    </>
  );

  const sidebarHeader = <SearchDialog />;

  return { logo, topNav, topActions, sidebarHeader };
}
