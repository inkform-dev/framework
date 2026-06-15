export const runtime = 'nodejs';

/**
 * POST /api/ask — AI assistant endpoint (feature-flagged).
 *
 * When NEXT_PUBLIC_DOCS_AI_ENABLED=true, this route is called by the <AskAi />
 * widget. It currently returns a stub response; real LLM integration is a
 * later phase.
 *
 * TODO (later phase): read DOCS_AI_PROVIDER and ANTHROPIC_API_KEY from env,
 * then call the configured provider (e.g. Anthropic claude-haiku-4-5 via the
 * @anthropic-ai/sdk) to stream or resolve a real answer from the docs content.
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

  // Parse the incoming messages array (sent by AskAi component).
  let messages: unknown;
  try {
    const body = await request.json() as { messages?: unknown };
    messages = body?.messages;
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!Array.isArray(messages)) {
    return Response.json({ error: 'messages must be an array.' }, { status: 400 });
  }

  // Stub response — replace with real LLM call when DOCS_AI_PROVIDER is set.
  return Response.json({
    text: 'AI answers will appear here once a provider is configured.',
  });
}
