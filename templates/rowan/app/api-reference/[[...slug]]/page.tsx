import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { DocsShell, Sidebar } from '@inkform/framework/docs-shell';
import { loadDocsConfig, loadOpenApiSpecForBuild } from '@inkform/framework/content';
import { findOperation, parseOpenApi } from '@inkform/framework/openapi';
import { renderOperationMarkdown } from '@inkform/framework/openapi-engine/markdown';
import { OperationPage } from '@inkform/framework/openapi-render';
import { buildTopBar } from '@/components/top-bar';
import { CopyPageButton } from '@/components/copy-page-button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { renderIcon } from '@/lib/icons';
import { apiTab, sidebarFlat, loadApiNavTree, withContentNavLinks } from '@/lib/route';

export const dynamicParams = false;

/**
 * Rowan renders operation pages under the SAME flat sidebar as doc pages
 * (see lib/route.tsx's sidebarFlat()) — this loader pulls both the
 * ApiNavData (nav tree + raw dereferenced schema, via the shared,
 * cache()-deduped loadApiNavTree()) and the narrower OpenApiModel
 * OperationPage itself needs (operation params/responses/security, via
 * parseOpenApi). The two independently bundle+dereference the same spec;
 * negligible at this spec's size and both only run at build time — same
 * tradeoff the birch/aurora version of this file already documented, before
 * loadApiNavTree() consolidated the *nav-tree* half of that duplication.
 * apiNav.schema also feeds CopyPageButton's content via
 * renderOperationMarkdown, below.
 */
async function loadReference() {
  const config = loadDocsConfig();
  if (!config) return null;
  const tab = apiTab(config);
  if (!tab?.openapi || tab.apiReference?.renderer === 'scalar') return null;

  const [spec, apiNav] = await Promise.all([loadOpenApiSpecForBuild(tab.openapi), loadApiNavTree(config)]);
  if (!spec || !apiNav) return null;
  const model = await parseOpenApi(spec.raw, spec.format);

  return { config, tab, model, apiNav };
}

export async function generateStaticParams() {
  const ref = await loadReference();
  if (!ref) return [{ slug: undefined }];

  const params: { slug?: string[] }[] = [{ slug: undefined }];
  for (const group of ref.apiNav.tree.tagGroups) {
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

  const { config, tab, model, apiNav } = ref;
  const topBar = buildTopBar(withContentNavLinks(config), tab.tab);

  let content: ReactNode;
  let activeOperationId: string | undefined;
  let copyContent: string;

  if (slug?.[0] === 'operations' && slug[1]) {
    const op = findOperation(model, slug[1]);
    if (!op) notFound();
    activeOperationId = op.operationId;
    content = <OperationPage operation={op} servers={model.servers} />;
    copyContent = renderOperationMarkdown(apiNav.schema, { operationId: op.operationId });
  } else {
    content = (
      <div className="fw-apiref">
        <div className="fw-apiref-header">
          <h1 className="fw-apiref-title">{model.info.title}</h1>
          {model.info.description ? <p className="fw-apiref-desc">{model.info.description}</p> : null}
        </div>
      </div>
    );
    copyContent = [`# ${model.info.title}`, model.info.description ?? ''].filter(Boolean).join('\n\n');
  }

  // Rowan has no Guides|API-Reference tab switcher — every page (doc or
  // operation) renders the same flat sidebar. See lib/route.tsx's
  // sidebarFlat() and components/top-bar.tsx's buildTopBar() doc comment.
  const sidebar = sidebarFlat(config, renderIcon, { operationId: activeOperationId }, apiNav);

  return (
    <DocsShell
      contentType="api"
      logo={topBar.logo}
      topNav={topBar.topNav}
      topActions={topBar.topActions}
      sidebar={<Sidebar groups={sidebar} footer={<LanguageSwitcher />} />}
      hideToc
    >
      <div className="fw-page-head">
        <CopyPageButton content={copyContent} />
      </div>
      {content}
    </DocsShell>
  );
}
