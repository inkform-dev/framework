import type { ReactNode } from 'react';
import Link from 'next/link';
import { AskAi } from '@inkform/framework/ask-ai';
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
// Rendered into the `topNav` slot, but pushed onto its own full-width row
// below the logo/search/assistant row by Yucca's own theme.css (see the
// "header" section there) — verified on palm.mintlify.site: the tabs sit on
// a second line, left-aligned under the logo, underlined when active (no
// pill background). `.fw-topnav-tab`/`--active` classes are shared with
// every other theme; only the underline treatment is Yucca-specific CSS.

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

// ── Top bar props ─────────────────────────────────────────────────────────────

export interface TopBarParts {
  logo: ReactNode;
  topNav: ReactNode;
  topActions: ReactNode;
}

/**
 * Build the three DocsShell header slot contents for Yucca.
 * Server component — client islands (SearchDialog, AskAi) are already
 * marked 'use client' in the framework.
 *
 * Deltas from Birch, both verified directly on palm.mintlify.site:
 *  - No `<ThemeToggle>` here — Palm's header carries no theme control at
 *    all; the theme switcher lives at the bottom of the sidebar instead
 *    (see components/sidebar-footer.tsx), wired into page.tsx via
 *    CollapsibleSidebar's `footer` slot.
 *  - The search trigger is wrapped in `.fw-yucca-search-center` so it reads
 *    as centered in the header instead of flush right (CSS in theme.css).
 *  - `config.cta` is simply never set in this theme's docs.json — Palm's
 *    header has no CTA button at all. The render-if-present branch below is
 *    left in place (confirmed `buildTopBar` already no-ops with no `cta`)
 *    so a fork of this theme can still opt back in without touching this
 *    file.
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

  const topActions = (
    <>
      <div className="fw-yucca-search-center">
        <SearchDialog />
      </div>
      <AskAi enabled={aiEnabled} product={config.name} label="Ask Assistant" />
      {config.cta ? (
        <a
          href={config.cta.href}
          className="fw-topnav-cta"
          target={config.cta.href.startsWith('http') ? '_blank' : undefined}
          rel={config.cta.href.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {config.cta.label}
        </a>
      ) : null}
    </>
  );

  return { logo, topNav, topActions };
}
