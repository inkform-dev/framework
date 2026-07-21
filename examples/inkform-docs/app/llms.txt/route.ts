import { buildLlmsTxt } from '@inkform/framework/llms-txt';
import { apiBasePath, loadDocsConfig } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

/**
 * GET /llms.txt — curated index for LLMs/agentic tools (https://llmstxt.org).
 * See app/llms-full.txt/route.ts for the whole-corpus counterpart.
 */
export async function GET(): Promise<Response> {
  const config = loadDocsConfig();
  // apiBasePath() returns a bare slug (e.g. "api-reference"); buildLlmsTxt()
  // expects a leading-slash base path to build clickable operation links.
  const apiBase = config && apiBasePath(config);
  const txt = await buildLlmsTxt({ apiBasePath: apiBase ? `/${apiBase}` : undefined });
  return new Response(txt, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
