/**
 * Grounds a chat message in this site's own content — the same retrieval
 * primitives the MCP server uses (search/getDoc/getOperation from
 * mcp/tools.ts), not a separate implementation. search() ranks which
 * doc pages / operations are relevant; getDoc()/getOperation() then fetch
 * each one's FULL content for the LLM's context (not just search()'s short
 * excerpt, which is sized for a search-result list, not for grounding an
 * answer).
 */

import { generateText, type ModelMessage } from 'ai';
import { loadDocsConfig } from '../content';
import { getDoc, getOperation, search, type McpSearchResult } from '../mcp/tools';
import { getModel } from './provider';

export interface AskSource {
  type: 'doc' | 'operation';
  title: string;
  id: string;
  href: string;
}

export interface AskResult {
  text: string;
  sources: AskSource[];
}

function buildSystemPrompt(siteName: string, context: string): string {
  return `You are a documentation assistant for ${siteName}. Answer the user's question using ONLY the context below, which is real content from this site's documentation and API reference.

If the context doesn't contain the answer, say so plainly rather than guessing or using outside knowledge — do not fabricate.

When you use something from the context, reference it naturally (e.g. "According to the Quickstart guide..." or "The Get a Pokémon operation returns...") so the reader knows where the information comes from. Keep answers concise and direct.

## Context

${context || '(No relevant content was found on this site for this question.)'}`;
}

async function buildContext(results: McpSearchResult[]): Promise<string> {
  const parts = await Promise.all(
    results.map(async (r) => {
      const full = r.type === 'doc' ? await getDoc(r.id) : await getOperation(r.id);
      return `## ${r.title}\n\n${full ?? r.excerpt}`;
    }),
  );
  return parts.join('\n\n---\n\n');
}

function sourceHref(result: McpSearchResult, apiBasePath: string): string {
  return result.type === 'operation' ? `${apiBasePath}/operations/${result.id}` : `/${result.id}`;
}

/**
 * @param apiBasePath e.g. "/api-reference" (the app's own DocsTab slug) — used to build
 * clickable links for operation sources. Callers compute this from their own docs.json;
 * framework code stays decoupled from any one app's routing.
 */
export async function askDocs(messages: ModelMessage[], options?: { apiBasePath?: string }): Promise<AskResult> {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const query = typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : '';
  if (!query.trim()) {
    return { text: 'Please ask a question.', sources: [] };
  }

  const config = loadDocsConfig();
  const results = await search(query, 5);
  const context = await buildContext(results);

  const result = await generateText({
    model: getModel(),
    system: buildSystemPrompt(config?.name ?? 'this site', context),
    messages,
  });

  const apiBasePath = options?.apiBasePath ?? '/api-reference';
  const sources: AskSource[] = results.map((r) => ({
    type: r.type,
    title: r.title,
    id: r.id,
    href: sourceHref(r, apiBasePath),
  }));

  return { text: result.text, sources };
}
