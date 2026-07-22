import type { ReactNode } from 'react';
import Link from 'next/link';
import { AskAi } from '@inkform/framework/ask-ai';
import { SearchDialog } from '@inkform/framework/search-dialog';
import { SecondaryTopNav } from '@inkform/framework/secondary-top-nav';
import type { DocsConfig } from '@inkform/framework';
import { apiBasePath } from '@/lib/route';

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

export interface TopBarParts {
  logo: ReactNode;
  topNav: ReactNode;
  topActions: ReactNode;
  cta: ReactNode;
}

export function buildTopBar(
  config: DocsConfig,
  activeTab: string,
  pathname = '/',
): TopBarParts {
  const aiEnabled = process.env.NEXT_PUBLIC_DOCS_AI_ENABLED === 'true';

  const logo = <Logo config={config} />;

  const topNav = (
    <SecondaryTopNav
      config={config}
      activeTab={activeTab}
      pathname={pathname}
      apiBase={apiBasePath(config)}
    />
  );

  const topActions = (
    <>
      <div className="fw-galley-search-center">
        <SearchDialog />
      </div>
      <AskAi enabled={aiEnabled} product={config.name} label="Ask Assistant" />
    </>
  );

  const cta = config.cta ? (
    <a
      href={config.cta.href}
      className="fw-topnav-cta"
      target={config.cta.href.startsWith('http') ? '_blank' : undefined}
      rel={config.cta.href.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {config.cta.label}
    </a>
  ) : null;

  return { logo, topNav, topActions, cta };
}
