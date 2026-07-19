import { ApiReference } from '@scalar/nextjs-api-reference';
import { docTabs } from '@inkform/framework';
import { loadDocsConfig, resolveOpenApiSource } from '@inkform/framework/content';
import { buildScalarCustomCss } from '@inkform/framework/scalar-theme';
import { baseScalarTheme } from '@/lib/scalar-theme-palette';

/**
 * The API Reference tab (docs.json: a DocsTab with an `openapi` field) is
 * served here as its own route, separate from the docs catch-all — Scalar
 * owns this whole subtree and renders its own UI, not a Next.js page per
 * operation. See lib/route.tsx's apiBasePath() for how the top nav's
 * "API Reference" tab link is generated to match this path; if you rename
 * the tab away from "API Reference" in docs.json, rename this route folder
 * to match the new slug.
 */
function getTab() {
  const config = loadDocsConfig();
  if (!config) return null;
  const tab = docTabs(config).find((t) => !!t.openapi);
  return tab?.openapi ? tab : null;
}

export async function GET() {
  const tab = getTab();
  const source = tab?.openapi ? resolveOpenApiSource(tab.openapi) : null;
  if (!source) {
    return new Response('No OpenAPI spec configured for this project.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  return ApiReference({
    ...source,
    theme: 'none',
    customCss: buildScalarCustomCss(baseScalarTheme),
    withDefaultFonts: false,
    mcp: tab?.mcp,
  })();
}
