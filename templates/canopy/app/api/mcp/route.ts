import { createMcpHandler } from '@inkform/framework/mcp';

/**
 * Self-hostable MCP server exposing this site's own docs + API reference as
 * tools (search / get_doc / get_operation / list_operations) — see
 * ARCHITECTURE.md §8. Zero config, no API keys: content-only, no LLM calls
 * happen in this route.
 *
 * This is also what makes AiToolMenu's "Connect to Cursor" / "Connect to VS
 * Code" (right rail on every doc page — see components/top-bar.tsx-adjacent
 * wiring in app/[[...slug]]/page.tsx) a real, working feature rather than a
 * decorative link: both install exactly this endpoint as an MCP server in
 * the reader's editor.
 */
const handler = createMcpHandler({ name: 'canopy-docs' });
export { handler as GET, handler as POST, handler as DELETE };
