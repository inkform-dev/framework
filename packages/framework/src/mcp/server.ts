/**
 * Framework-native, self-hostable MCP server. Wraps tools.ts as real MCP
 * tools and exposes it as a Next.js-route-handler-shaped function — mount
 * at e.g. app/api/mcp/route.ts. Config-driven (reads the site's own
 * content/docs.json, same as everything else in this framework); zero
 * required Inkform-specific env vars, no platform coupling.
 *
 * Uses WebStandardStreamableHTTPServerTransport in stateless mode
 * (sessionIdGenerator: undefined) — the right fit for a serverless/
 * edge-friendly route handler, where nothing guarantees the same server
 * instance handles a client's next request.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { getDoc, getOperation, listOperations, search } from './tools';

function registerTools(server: McpServer) {
  server.registerTool(
    'search',
    {
      title: 'Search docs and API reference',
      description: 'Fuzzy search across this site\'s documentation pages and API operations in one ranked result list.',
      inputSchema: {
        query: z.string().describe('The search query.'),
        limit: z.number().int().min(1).max(50).optional().describe('Max results to return (default 10).'),
      },
    },
    async ({ query, limit }) => {
      const results = await search(query, limit);
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get_operation',
    {
      title: 'Get one API operation as Markdown',
      description: 'Returns the full documentation for one API operation (parameters, request body, responses) as Markdown, by operationId.',
      inputSchema: {
        operationId: z.string().describe('The operationId, as returned by list_operations or search.'),
      },
    },
    async ({ operationId }) => {
      const markdown = await getOperation(operationId);
      if (markdown === null) {
        return { content: [{ type: 'text', text: `No operation found with operationId "${operationId}".` }], isError: true };
      }
      return { content: [{ type: 'text', text: markdown }] };
    },
  );

  server.registerTool(
    'list_operations',
    {
      title: 'List all API operations',
      description: 'Lists every operation in this site\'s configured OpenAPI spec — operationId, method, path, summary, tag.',
      inputSchema: {},
    },
    async () => {
      const ops = await listOperations();
      return { content: [{ type: 'text', text: JSON.stringify(ops, null, 2) }] };
    },
  );

  server.registerTool(
    'get_doc',
    {
      title: 'Get a documentation page',
      description: 'Returns the raw MDX content of one documentation page, by slug.',
      inputSchema: {
        slug: z.string().describe('The page slug, as returned by search.'),
      },
    },
    async ({ slug }) => {
      const content = await getDoc(slug);
      if (content === null) {
        return { content: [{ type: 'text', text: `No doc page found with slug "${slug}".` }], isError: true };
      }
      return { content: [{ type: 'text', text: content }] };
    },
  );
}

export interface CreateMcpHandlerOptions {
  /** Shown to MCP clients as the server's identity. Defaults to a generic name — set this to your site's name. */
  name?: string;
  version?: string;
}

/**
 * Creates a Next.js-route-handler-shaped function: `(request: Request) => Promise<Response>`.
 *
 * ```ts
 * // app/api/mcp/route.ts
 * import { createMcpHandler } from '@inkform/framework/mcp';
 * const handler = createMcpHandler({ name: 'my-docs' });
 * export { handler as GET, handler as POST, handler as DELETE };
 * ```
 *
 * A fresh McpServer + transport pair is created on every call — confirmed
 * necessary, not just cautious, by an actual server-side error hit while
 * verifying this against a real client: "Stateless transport cannot be
 * reused across requests. Create a new transport per request." A first
 * version of this function created one transport at module scope, reusing
 * it across requests the way the SDK's own Hono doc example appears to
 * (`app.all('/mcp', c => transport.handleRequest(c.req.raw))` with
 * `transport` closed over from an outer scope) — that pattern throws on the
 * second request in stateless mode. Re-registering tools per request is
 * cheap regardless (it's just populating an in-memory map; the real work
 * only happens when a tool is actually invoked).
 */
export function createMcpHandler(options: CreateMcpHandlerOptions = {}): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const server = new McpServer({
      name: options.name ?? 'inkform-docs',
      version: options.version ?? '1.0.0',
    });
    registerTools(server);

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });

    await server.connect(transport);
    return transport.handleRequest(request);
  };
}
