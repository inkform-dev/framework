/**
 * Adapts an OpenApiNavTree (openapi-engine/nav.ts) into the framework's
 * existing generic Sidebar (docs-shell.tsx) — reused as-is rather than
 * building a new sidebar primitive; `.fw-sidebar-method` in api.css was
 * already built for exactly this "small method pill next to an endpoint
 * link" case.
 */

import type { ReactNode } from 'react';
import { Sidebar, type SidebarGroup, type SidebarItem } from '../docs-shell';
import type { HttpMethod, OpenApiNavTree } from '../openapi-engine/nav';

function MethodIcon({ method }: { method: HttpMethod }): ReactNode {
  return <span className={`fw-method-pill fw-sidebar-method fw-method-${method}`}>{method}</span>;
}

/**
 * @param basePath e.g. `/api-reference` — operation links become `${basePath}/operations/${operationId}`.
 * @param activeOperationId marks the current page's sidebar item active.
 *
 * Operations only for now — `tree.webhooks`/`tree.models` are deliberately
 * not linked here yet, since there's no webhook/model detail route to send
 * them to (out of scope for this first slice; would be dead links).
 */
export function buildReferenceSidebarGroups(
  tree: OpenApiNavTree,
  basePath: string,
  activeOperationId?: string,
): SidebarGroup[] {
  return tree.tagGroups.map((tagGroup) => ({
    group: tagGroup.tag,
    items: tagGroup.operations.map(
      (op): SidebarItem => ({
        title: op.summary,
        href: `${basePath}/operations/${op.operationId}`,
        active: op.operationId === activeOperationId,
        icon: <MethodIcon method={op.method} />,
      }),
    ),
  }));
}

export function ReferenceSidebar({
  tree,
  basePath,
  activeOperationId,
}: {
  tree: OpenApiNavTree;
  basePath: string;
  activeOperationId?: string;
}): ReactNode {
  return <Sidebar groups={buildReferenceSidebarGroups(tree, basePath, activeOperationId)} />;
}
