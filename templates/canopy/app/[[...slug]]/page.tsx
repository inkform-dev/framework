import { notFound } from 'next/navigation';
import { Mdx } from '@inkform/framework/mdx';
import { DocsShell, TocList, Pagination } from '@inkform/framework/docs-shell';
import { docNeighbours } from '@inkform/framework';
import { loadDocsConfig, extractHeadings } from '@inkform/framework/content';
import { siteMdxComponents } from '@/mdx-components';
import { buildTopBar } from '@/components/top-bar';
import { CollapsibleSidebar } from '@/components/collapsible-sidebar';
import { SidebarFooter } from '@/components/sidebar-footer';
import { renderIcon } from '@/lib/icons';
import { resolveRoute, listAllRoutes, sidebarForDoc, withContentNavLinks } from '@/lib/route';

export const dynamicParams = false;

// ── Static params ─────────────────────────────────────────────────────────────

export function generateStaticParams() {
  const config = loadDocsConfig();
  if (!config) return [{ slug: [] as string[] }];
  const routes = listAllRoutes(config);
  // Next.js optional catch-all: [] = index, [...rest] = nested. Map [] → undefined
  // to match the [[...slug]] convention (both work, but undefined is canonical).
  return routes.map((slug) => ({ slug: slug.length === 0 ? undefined : slug }));
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const route = resolveRoute(slug);
  if (!route) return {};
  return { title: route.ref.title };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const route = resolveRoute(slug);
  if (!route) notFound();

  const { config, ref, page, tab } = route;
  const headings = extractHeadings(page.content);
  const { prev, next } = docNeighbours(config, ref.slug);
  const sidebar = sidebarForDoc(config, tab, ref.slug, renderIcon);
  const topBar = buildTopBar(withContentNavLinks(config), tab.tab);

  return (
    <DocsShell
      contentType="doc"
      logo={topBar.logo}
      topNav={topBar.topNav}
      topActions={topBar.topActions}
      cta={topBar.cta}
      sidebar={<CollapsibleSidebar title={tab.tab} groups={sidebar} footer={<SidebarFooter />} />}
      toc={headings.length > 0 ? <TocList headings={headings} /> : undefined}
      hideToc={headings.length === 0}
    >
      <Mdx source={page.content} components={siteMdxComponents} />
      <Pagination
        prev={prev ? { title: prev.title, href: '/' + prev.slug } : null}
        next={next ? { title: next.title, href: '/' + next.slug } : null}
      />
    </DocsShell>
  );
}
