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

/**
 * Glyph swaps the shared framework's pill-shaped tab row for plain text
 * links — bold+bright when active, muted when not — matching Linden's own
 * "Documentation" / "API Reference" top nav. Still driven by docTabs(config)
 * like every other theme; only the rendered classNames differ (glyph-toplink*
 * instead of fw-topnav-tab*, styled in theme.css — not part of the shared
 * fw-* contract, this markup is 100% theme-owned).
 */
function TabNav({ config, activeTab }: { config: DocsConfig; activeTab: string }) {
  const tabs = docTabs(config);
  const apiBase = apiBasePath(config);

  return (
    <div className="glyph-toplinks">
      {tabs.map((t) => {
        const href = t.openapi && apiBase ? `/${apiBase}` : '/';
        const isActive = t.tab === activeTab;
        return (
          <a
            key={t.tab}
            href={href}
            className={`glyph-toplink${isActive ? ' glyph-toplink--active' : ''}`}
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
 * Build the three DocsShell header slot contents for Glyph.
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

  const topActions = (
    <>
      <SearchDialog />
      <ThemeToggle />
      <AskAi enabled={aiEnabled} product={config.name} />
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
