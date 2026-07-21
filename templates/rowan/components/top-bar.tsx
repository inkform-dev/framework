import type { ReactNode } from 'react';
import Link from 'next/link';
import { AskAi } from '@inkform/framework/ask-ai';
import { SearchDialog } from '@inkform/framework/search-dialog';
import type { DocsConfig } from '@inkform/framework';
import { ThemeModeToggle } from '@/components/theme-mode-toggle';

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
 * Build the three DocsShell header slot contents for Rowan.
 *
 * Judgment call — tabs vs. a flat sidebar: the reference site (Maple) has no
 * Guides|API-Reference tab switcher at all; every page shares one flat
 * sidebar mixing doc groups and API operation groups (see lib/route.tsx's
 * sidebarFlat(), used by both app/[[...slug]]/page.tsx and
 * app/api-reference/[[...slug]]/page.tsx). This function reflects that —
 * no <TabNav> here, unlike Birch/Aurora/Mono.
 *
 * content/docs/docs.json still declares two entries under `tabs` internally
 * ("Guides" + "API Reference") rather than switching to the single-implicit-
 * tab shape (top-level `navigation` + `openapi`, no `tabs` key) that
 * nav.ts's docTabs() also supports. That looked like the more "honest" fit
 * for a tabless theme at first, but the implicit tab docTabs() synthesizes
 * is hardcoded to the label "Documentation" (packages/framework/src/nav.ts)
 * — apiBasePath() slugifies whichever tab label carries `openapi`, so that
 * path would resolve to "documentation", not "api-reference", which doesn't
 * match the physical app/api-reference/ route folder every operation link
 * the native renderer generates depends on. Keeping the proven two-tab
 * shape and simply never rendering a switcher for it sidesteps that
 * mismatch entirely — sidebarFlat() is what actually makes the UI tabless,
 * not the docs.json shape.
 *
 * `_activeTab` is accepted (unused) for call-site parity with every other
 * theme's buildTopBar(config, tab.tab) — there's no tab pill here to mark
 * active.
 */
export function buildTopBar(config: DocsConfig, _activeTab: string): TopBarParts {
  const aiEnabled = process.env.NEXT_PUBLIC_DOCS_AI_ENABLED === 'true';

  const logo = <Logo config={config} />;

  const topNav = (
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

  const topActions = (
    <>
      <SearchDialog />
      <ThemeModeToggle />
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
