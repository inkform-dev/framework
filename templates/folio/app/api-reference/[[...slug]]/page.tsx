import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { DocsShell, Sidebar } from '@inkform/framework/docs-shell';
import { loadDocsConfig, loadOpenApiSpecForBuild } from '@inkform/framework/content';
import { findOperation, parseOpenApi } from '@inkform/framework/openapi';
import { parseOpenApiDocument } from '@inkform/framework/openapi-engine/parse';
import { buildNavTree } from '@inkform/framework/openapi-engine/nav';
import { OperationPage, buildReferenceSidebarGroups } from '@inkform/framework/openapi-render';
import { buildTopBar } from '@/components/top-bar';
import { apiBasePath, apiTab, sidebarFooter, withContentNavLinks } from '@/lib/route';

export const dynamicParams = false;

/**
 * Loads the spec twice — once via parseOpenApi (the narrow OpenApiModel
 * used for ApiLink-style operation lookup) and once via parseOpenApiDocument
 * + buildNavTree (the full dereferenced document, needed for the nav tree).
 * Both bundle/dereference the same spec independently; negligible at this
 * spec's size and this only runs at build time, but worth consolidating
 * into one pass if a second native-renderer consumer needs both shapes.
 */
async function loadReference() {
  const config = loadDocsConfig();
  if (!config) return null;
  const tab = apiTab(config);
  if (!tab?.openapi || tab.apiReference?.renderer === 'scalar') return null;

  const spec = await loadOpenApiSpecForBuild(tab.openapi);
  if (!spec) return null;

  const [model, { schema }] = await Promise.all([
    parseOpenApi(spec.raw, spec.format),
    parseOpenApiDocument(spec.raw, { format: spec.format }),
  ]);

  return { config, tab, model, tree: buildNavTree(schema) };
}

export async function generateStaticParams() {
  const ref = await loadReference();
  if (!ref) return [{ slug: undefined }];

  const params: { slug?: string[] }[] = [{ slug: undefined }];
  for (const group of ref.tree.tagGroups) {
    for (const op of group.operations) {
      params.push({ slug: ['operations', op.operationId] });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const ref = await loadReference();
  if (!ref) return {};

  if (slug?.[0] === 'operations' && slug[1]) {
    const op = findOperation(ref.model, slug[1]);
    if (op) return { title: `${op.summary} · ${ref.model.info.title}` };
  }
  return { title: ref.model.info.title };
}

export default async function ApiReferencePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const ref = await loadReference();
  if (!ref) notFound();

  const { config, tab, model, tree } = ref;
  const basePath = `/${apiBasePath(config)}`;
  const topBar = buildTopBar(withContentNavLinks(config), tab.tab);

  let content: ReactNode;
  let activeOperationId: string | undefined;

  if (slug?.[0] === 'operations' && slug[1]) {
    const op = findOperation(model, slug[1]);
    if (!op) notFound();
    activeOperationId = op.operationId;
    content = <OperationPage operation={op} servers={model.servers} />;
  } else {
    content = (
      <div className="fw-apiref">
        <div className="fw-apiref-header fw-apiref-header--intro">
          <h1 className="fw-apiref-title">{model.info.title}</h1>
          {model.info.description ? <p className="fw-apiref-desc">{model.info.description}</p> : null}
        </div>
      </div>
    );
  }

  // Willow-style eyebrow: the active tag group's name for an operation page
  // (e.g. "Endpoint Examples"), or the tab's own label on the tab's intro
  // page, which isn't inside any tag group.
  const eyebrow =
    (activeOperationId &&
      tree.tagGroups.find((g) => g.operations.some((o) => o.operationId === activeOperationId))?.tag) ||
    tab.tab;

  // buildReferenceSidebarGroups + Sidebar (rather than the framework's
  // ReferenceSidebar convenience wrapper) so the sidebar-bottom "Dashboard"
  // link (sidebarFooter — see lib/route.tsx) can ride along via Sidebar's
  // own footer slot; ReferenceSidebar doesn't expose one.
  const sidebar = (
    <Sidebar
      groups={buildReferenceSidebarGroups(tree, basePath, activeOperationId)}
      footer={sidebarFooter(config)}
    />
  );

  return (
    <DocsShell
      contentType="api"
      logo={topBar.logo}
      topNav={topBar.topNav}
      topActions={topBar.topActions}
      sidebar={sidebar}
      hideToc
    >
      <p className="fw-eyebrow">{eyebrow}</p>
      {content}
    </DocsShell>
  );
}
