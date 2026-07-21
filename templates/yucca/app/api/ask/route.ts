import { askDocs } from '@inkform/framework/ai';
import { loadDocsConfig } from '@inkform/framework/content';
import { apiBasePath } from '@/lib/route';

export const runtime = 'nodejs';

/**
 * POST /api/ask — AI assistant endpoint (feature-flagged).
 *
 * Grounded in this site's own content via askDocs() (@inkform/framework/ai)
 * — the same search/getDoc/getOperation retrieval the MCP server uses, not
 * a separate implementation. BYO model: set DOCS_AI_PROVIDER
 * ('anthropic' | 'openai' | 'google', default 'anthropic') and that
 * provider's own API key env var (ANTHROPIC_API_KEY, etc.) — see
 * packages/framework/src/ai/provider.ts.
 *
 * Metered billing for the platform-hosted version of this endpoint is
 * out of scope here — see inkform/PLATFORM_MCP_SCOPING.md for the sibling
 * MCP billing question this will eventually need the same answer to.
 */
export async function POST(request: Request): Promise<Response> {
  const enabled = process.env.NEXT_PUBLIC_DOCS_AI_ENABLED === 'true';

  if (!enabled) {
    return Response.json(
      {
        error:
          'AI assistant is disabled. Set NEXT_PUBLIC_DOCS_AI_ENABLED=true to enable it (configured in a later release).',
      },
      { status: 503 },
    );
  }

  let messages: unknown;
  try {
    const body = (await request.json()) as { messages?: unknown };
    messages = body?.messages;
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.some((m) => typeof m?.role !== 'string' || typeof m?.content !== 'string')) {
    return Response.json({ error: 'messages must be an array of { role, content }.' }, { status: 400 });
  }

  const config = loadDocsConfig();
  // apiBasePath() returns a bare slug (e.g. "api-reference"); askDocs()
  // expects a leading-slash base path to build clickable operation links.
  const apiBase = config && apiBasePath(config);
  try {
    const result = await askDocs(messages, { apiBasePath: apiBase ? `/${apiBase}` : undefined });
    return Response.json(result);
  } catch (e) {
    // Most likely cause: no API key configured for DOCS_AI_PROVIDER.
    return Response.json(
      { error: e instanceof Error ? e.message : 'The AI assistant is not configured correctly.' },
      { status: 500 },
    );
  }
}
