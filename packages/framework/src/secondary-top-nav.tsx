import type { DocsConfig } from './nav';
import { docTabs } from './nav';
import { ScrollableTopNav } from './scrollable-top-nav';

export type SecondaryTopNavProps = {
  config: DocsConfig;
  /** Active docs tab label (from route resolution). Empty on blog/changelog pages. */
  activeTab: string;
  /** Current pathname, e.g. `/blog`, `/changelog`, `/guides/docs`. */
  pathname: string;
  /** Slug base for the OpenAPI tab link, e.g. `api-reference`. Omit when none. */
  apiBase?: string | null;
};

function isInternalNavActive(pathname: string, href: string): boolean {
  if (href.startsWith('http')) return false;
  if (href === '/') return pathname === '/' || pathname === '';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function tabClass(active: boolean) {
  return `fw-topnav-tab${active ? ' fw-topnav-tab--active' : ''}`;
}

/** Anchors and navbarLinks can point at the same URL; render once (anchors win). */
function mergeTopBarLinks(
  anchors: NonNullable<DocsConfig['anchors']>,
  navlinks: NonNullable<DocsConfig['navbarLinks']>,
) {
  const seen = new Set<string>();
  const merged: Array<{ name: string; href: string }> = [];

  for (const link of [...anchors, ...navlinks]) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    merged.push(link);
  }

  return merged;
}

/**
 * Unified secondary header row: doc tabs, anchors, and navbar links share the
 * same underline-tab styling and active state logic.
 */
export function SecondaryTopNav({ config, activeTab, pathname, apiBase }: SecondaryTopNavProps) {
  const tabs = docTabs(config);
  const extraLinks = mergeTopBarLinks(config.anchors ?? [], config.navbarLinks ?? []);

  const onBlog = pathname.startsWith('/blog');
  const onChangelog = pathname.startsWith('/changelog');
  const onDocs = !onBlog && !onChangelog;

  return (
    <ScrollableTopNav>
      <div className="fw-topnav-tabs">
        {tabs.map((t) => {
          const href = t.openapi && apiBase ? `/${apiBase}` : '/';
          const onApiRoute =
            !!apiBase && (pathname === `/${apiBase}` || pathname.startsWith(`/${apiBase}/`));
          const isActive = t.openapi ? onApiRoute : onDocs && t.tab === activeTab;

          return (
            <a
              key={t.tab}
              href={href}
              className={tabClass(isActive)}
              aria-current={isActive ? 'page' : undefined}
            >
              {t.tab}
            </a>
          );
        })}

        {extraLinks.map((l) => {
          const external = l.href.startsWith('http');
          const isActive = isInternalNavActive(pathname, l.href);

          return (
            <a
              key={l.href}
              href={l.href}
              className={tabClass(isActive)}
              aria-current={isActive ? 'page' : undefined}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {l.name}
            </a>
          );
        })}
      </div>
    </ScrollableTopNav>
  );
}
