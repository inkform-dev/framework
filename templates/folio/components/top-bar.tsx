import type { ReactNode } from 'react';
import Link from 'next/link';
import { AskAi } from '@inkform/framework/ask-ai';
import { ThemeToggle } from '@inkform/framework/theme-toggle';
import { SearchDialog } from '@inkform/framework/search-dialog';
import type { DocsConfig } from '@inkform/framework';
import { docTabs } from '@inkform/framework';
import { loadDocsConfig } from '@inkform/framework/content';
import { SectionSwitcher } from '@/components/section-switcher';
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
        <span className="fw-shell-brand-name">
          {config.name}
          <sup className="fw-shell-brand-tm">™</sup>
        </span>
      )}
    </Link>
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

// ── Top bar props ─────────────────────────────────────────────────────────────

export interface TopBarParts {
  logo: ReactNode;
  topNav: ReactNode;
  topActions: ReactNode;
}

/**
 * Build the three DocsShell header slot contents for Folio.
 * Server component — client islands (SectionSwitcher, SearchDialog,
 * ThemeToggle, AskAi) are each their own 'use client' module.
 *
 * Folio's header departs from every other theme in two ways:
 *  - The section switcher (Get Started / API Reference) is a dropdown next
 *    to the logo, not a pill row in the center nav — so it rides in the
 *    `logo` slot, grouped with the brand, instead of `topNav`. See
 *    components/section-switcher.tsx.
 *  - There is no CTA button here at all. Willow moves "Dashboard" to the
 *    bottom of the sidebar instead (lib/route.tsx's sidebarFooter(), wired
 *    up in app/[[...slug]]/page.tsx and app/api-reference/[[...slug]]/page.tsx)
 *    — config.cta is intentionally not read below.
 */
export function buildTopBar(config: DocsConfig, activeTab: string): TopBarParts {
  const aiEnabled = process.env.NEXT_PUBLIC_DOCS_AI_ENABLED === 'true';

  // Resolved server-side (this is a server component) and handed to the
  // 'use client' SectionSwitcher as plain data — see that file's header
  // comment for why it can't compute this itself.
  const tabs = docTabs(config);
  const apiBase = apiBasePath(config);
  const switcherItems = tabs.map((t) => ({
    tab: t.tab,
    href: t.openapi && apiBase ? `/${apiBase}` : '/',
  }));

  const logo = (
    <>
      <Logo config={config} />
      {switcherItems.length > 1 ? (
        <>
          <span className="fw-brand-divider" aria-hidden />
          <SectionSwitcher items={switcherItems} activeTab={activeTab} />
        </>
      ) : null}
    </>
  );

  const anchorsAndLinks = (
    <>
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
  const hasAnchorsOrLinks = (config.anchors ?? []).length > 0 || (config.navbarLinks ?? []).length > 0;
  const topNav = hasAnchorsOrLinks ? anchorsAndLinks : null;

  const topActions = (
    <>
      <SearchDialog />
      <ThemeToggle />
      <AskAi enabled={aiEnabled} product={config.name} label="Ask Assistant" />
    </>
  );

  return { logo, topNav, topActions };
}
