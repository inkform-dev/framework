import { notFound } from 'next/navigation';
import { Mdx } from '@freewrite-cms/framework/mdx';
import { DocsShell, Sidebar, TocList, Pagination } from '@freewrite-cms/framework/docs-shell';
import { ApiReferenceView } from '@freewrite-cms/framework/api-reference';
import {
  docNeighbours,
  buildSearchIndex,
} from '@freewrite-cms/framework';
import { loadDocsConfig, extractHeadings } from '@freewrite-cms/framework/content';
import { siteMdxComponents } from '@/mdx-components';
import { buildTopBar } from '@/components/top-bar';
import { renderIcon } from '@/lib/icons';
import {
  resolveRoute,
  listAllRoutes,
  sidebarForDoc,
  sidebarForApi,
  apiBasePath,
} from '@/lib/route';

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
  if (route.kind === 'doc') return { title: route.ref.title };
  if (route.kind === 'api') return { title: route.operation.summary };
  // api-index
  return { title: route.model.info.title };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const route = resolveRoute(slug);
  if (!route) notFound();

  const { config } = route;
  const apiBase = apiBasePath(config) ?? '';

  // Build search index once per render (build time = static)
  const searchIndex = buildSearchIndex({
    docs: { config },
    basePaths: { docs: '' },
  });

  // ── Doc page ───────────────────────────────────────────────────────────────
  if (route.kind === 'doc') {
    const { ref, page, tab } = route;
    const headings = extractHeadings(page.content);
    const { prev, next } = docNeighbours(config, ref.slug);
    const sidebar = sidebarForDoc(config, tab, ref.slug, renderIcon);
    const topBar = buildTopBar(config, tab.tab, searchIndex);

    return (
      <DocsShell
        logo={topBar.logo}
        topNav={topBar.topNav}
        topActions={topBar.topActions}
        sidebar={<Sidebar groups={sidebar} />}
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

  // ── API Index ──────────────────────────────────────────────────────────────
  if (route.kind === 'api-index') {
    const { model, tab } = route;
    const firstOp = model.operations[0];
    const activeOpId = firstOp?.operationId ?? null;
    const sidebar = sidebarForApi(model, apiBase, activeOpId);
    const topBar = buildTopBar(config, tab.tab, searchIndex);

    return (
      <DocsShell
        logo={topBar.logo}
        topNav={topBar.topNav}
        topActions={topBar.topActions}
        sidebar={<Sidebar groups={sidebar} />}
        hideToc
      >
        {firstOp ? (
          <ApiReferenceView
            operation={firstOp}
            servers={model.servers}
          />
        ) : (
          <div className="fw-prose">
            <h1>{model.info.title}</h1>
            {model.info.description ? <p>{model.info.description}</p> : null}
            <p>No API operations found in the spec.</p>
          </div>
        )}
      </DocsShell>
    );
  }

  // ── API operation ──────────────────────────────────────────────────────────
  const { operation, model, tab } = route;
  const sidebar = sidebarForApi(model, apiBase, operation.operationId);
  const topBar = buildTopBar(config, tab.tab, searchIndex);

  return (
    <DocsShell
      logo={topBar.logo}
      topNav={topBar.topNav}
      topActions={topBar.topActions}
      sidebar={<Sidebar groups={sidebar} />}
      hideToc
    >
      <ApiReferenceView
        operation={operation}
        servers={model.servers}
      />
    </DocsShell>
  );
}
