/**
 * AI tool registry — the "hand this page to an AI tool" actions used by both
 * AiToolMenu and PageActions. Pure data + one resolver, instead of one
 * function per tool.
 *
 * Three kinds:
 * - `prompt` — a web tool that takes the page URL and pre-fills a prompt in a
 *   query param (`Ask ChatGPT`, `Ask Claude`, ...). Opens as a link.
 * - `mcp` — a local editor deeplink that installs THIS SITE'S OWN MCP server
 *   (see '@inkform/framework/mcp') into the reader's editor (`Open in
 *   Cursor`, `Open in VS Code`). Opens as a link.
 * - `command` — a local CLI tool; clicking copies a terminal command the
 *   reader pastes into their own shell (`opencode run "…"`, `claude "…"`,
 *   `codex exec "…"`, `agy -p "…"`).
 *   Used where a reliable deep link doesn't exist (e.g. claude-code's
 *   `claude-cli://` being stripped on some hosts).
 */

export type AiToolId =
  | 'chatgpt'
  | 'claude'
  | 'google'
  | 'cursor'
  | 'vscode'
  | 'opencode'
  | 'claude-code'
  | 'codex'
  | 'antigravity'
  | 'perplexity'
  | 'grok';

interface PromptTool {
  kind: 'prompt';
  id: AiToolId;
  label: string;
  /** Base URL, e.g. `https://chatgpt.com/`. */
  base: string;
  /** Query param the prompt goes in, e.g. `prompt` or `q`. */
  param: string;
  /** Extra fixed query params, e.g. `{ hints: 'search' }`. */
  extra?: Record<string, string>;
}

interface McpTool {
  kind: 'mcp';
  id: AiToolId;
  label: string;
  /** How to encode the MCP-install deeplink. */
  format: 'cursor' | 'vscode';
}

interface CommandTool {
  kind: 'command';
  id: AiToolId;
  label: string;
  /** Terminal command to copy; `{prompt}` is replaced with the quoted prompt. */
  command: string;
}

export type AiTool = PromptTool | McpTool | CommandTool;

/** The prompt every tool receives — read the page, ask about it. */
export function buildPrompt(pageUrl: string): string {
  return `Read ${pageUrl} and help me understand it`;
}

export const AI_TOOLS: AiTool[] = [
  { kind: 'prompt', id: 'chatgpt', label: 'Ask ChatGPT', base: 'https://chatgpt.com/', param: 'prompt', extra: { hints: 'search' } },
  { kind: 'prompt', id: 'claude', label: 'Ask Claude', base: 'https://claude.ai/new', param: 'q' },
  { kind: 'prompt', id: 'google', label: 'Ask Google', base: 'https://www.google.com/search', param: 'q' },
  { kind: 'mcp', id: 'cursor', label: 'Open in Cursor', format: 'cursor' },
  { kind: 'mcp', id: 'vscode', label: 'Open in VS Code', format: 'vscode' },
  { kind: 'command', id: 'opencode', label: 'OpenCode command', command: 'opencode run "{prompt}"' },
  { kind: 'command', id: 'claude-code', label: 'Claude Code command', command: 'claude "{prompt}"' },
  { kind: 'command', id: 'codex', label: 'Codex command', command: 'codex exec "{prompt}"' },
  { kind: 'command', id: 'antigravity', label: 'Antigravity command', command: 'agy -p "{prompt}"' },
  { kind: 'prompt', id: 'perplexity', label: 'Ask Perplexity', base: 'https://www.perplexity.ai/search', param: 'q' },
  { kind: 'prompt', id: 'grok', label: 'Ask Grok', base: 'https://grok.com/', param: 'q' },
];

/** Unicode-safe base64 (btoa() alone only handles Latin1) — guards a siteName with non-ASCII characters. */
function safeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function safeOrigin(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

function mcpInstallHref(format: McpTool['format'], siteName: string, mcpUrl: string): string {
  if (format === 'cursor') {
    // Cursor's documented one-click MCP install deep link:
    //   cursor://anysphere.cursor-deeplink/mcp/install?name=<name>&config=<base64 JSON>
    // The config is the mcp.json transport entry for a remote server — just
    // { url } (Cursor infers the HTTP transport from the `url` field).
    const config = safeBase64(JSON.stringify({ url: mcpUrl }));
    return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(siteName)}&config=${config}`;
  }
  // VS Code's documented MCP install URI: vscode:mcp/install?<url-encoded JSON>
  // — note the query segment IS the encoded JSON, not key=value pairs. The
  // JSON is the mcp.json server entry, so a URL server needs `"type":"http"`
  // (VS Code requires the transport type; without it the entry falls back to
  // stdio and the `url` field is invalid).
  return `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: siteName, type: 'http', url: mcpUrl }))}`;
}

export interface BuildAiToolHrefOptions {
  /** Page URL — required for `prompt` tools. */
  pageUrl?: string;
  /** MCP endpoint — required for the Cursor/VS Code MCP install links. */
  mcpUrl?: string;
  /** Shown to Cursor/VS Code as the installed MCP server's label. Defaults to 'Docs'. */
  siteName?: string;
}

/**
 * The reader-facing action for one tool: a link to open, or a terminal command
 * to copy. Returns null when a prerequisite is missing.
 */
export type AiToolAction =
  | { type: 'link'; href: string }
  | { type: 'command'; command: string };

/** Build one tool's action from the registry. Returns null when a prerequisite is missing. */
export function buildAiToolAction(tool: AiTool, options: BuildAiToolHrefOptions): AiToolAction | null {
  if (tool.kind === 'mcp') {
    if (!options.mcpUrl) return null;
    return { type: 'link', href: mcpInstallHref(tool.format, options.siteName ?? 'Docs', options.mcpUrl) };
  }
  if (tool.kind === 'command') {
    if (!options.pageUrl) return null;
    return {
      type: 'command',
      command: tool.command.replace('{prompt}', JSON.stringify(buildPrompt(options.pageUrl))),
    };
  }
  if (!options.pageUrl) return null;
  const url = new URL(tool.base);
  url.searchParams.set(tool.param, buildPrompt(options.pageUrl));
  for (const [key, value] of Object.entries(tool.extra ?? {})) {
    url.searchParams.set(key, value);
  }
  return { type: 'link', href: url.toString() };
}
