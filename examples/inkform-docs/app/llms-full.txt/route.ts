import { buildLlmsFullTxt } from '@inkform/framework/llms-txt';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

/**
 * GET /llms-full.txt — whole corpus concatenated (docs + API spec +
 * changelog + blog) for LLMs/agentic tools (https://llmstxt.org). See
 * app/llms.txt/route.ts for the curated-index counterpart.
 */
export async function GET(): Promise<Response> {
  const txt = await buildLlmsFullTxt();
  return new Response(txt, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
