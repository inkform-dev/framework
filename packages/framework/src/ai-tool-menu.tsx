'use client';

import * as React from 'react';

/**
 * AiToolMenu — a right-rail list of "hand this page to an AI tool" actions:
 * Copy page (raw Markdown), Open in ChatGPT/Claude/Perplexity/Grok (a
 * pre-filled prompt), Connect to Cursor/VS Code (installs THIS SITE'S OWN
 * MCP server — see '@inkform/framework/mcp' — into the reader's editor).
 *
 * Modeled on the right-rail menu at sequoia.mintlify.site (verified by
 * directly inspecting that site's own shipped implementation — intercepting
 * `window.open`/`navigator.clipboard.writeText` calls rather than guessing —
 * see the comment on each URL builder below for what was actually observed).
 * Ties into this framework's existing llms.txt/MCP work: the Cursor/VS Code
 * items are only meaningful because a theme can mount `createMcpHandler()`
 * (./mcp) at a real route in a couple of lines; this component is otherwise
 * independent of that and degrades gracefully (see `mcpUrl`) if no MCP route
 * exists.
 *
 * Framework components don't bundle an icon library (see ARCHITECTURE.md
 * §5) — `renderIcon` follows the same convention as Sidebar/DocsShell's own
 * `renderIcon` prop. Without one, a small brand-neutral built-in glyph is
 * used (a generic "copy" icon, and a generic external-link arrow for every
 * other item) rather than reproducing any tool's actual logo mark.
 */

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export type AiToolId = 'copy' | 'chatgpt' | 'claude' | 'cursor' | 'vscode' | 'perplexity' | 'grok';

export interface AiToolMenuProps {
  /**
   * Raw Markdown/MDX of the current page. "Copy page" writes this verbatim
   * to the clipboard — the same idea as GitHub/Mintlify's own "Copy page"
   * buttons. Falls back to copying the page URL when omitted.
   */
  pageContent?: string;
  /**
   * Absolute URL of the current page (e.g. "https://docs.example.com/quickstart").
   * Used as the pre-hydration href so links aren't briefly blank; every link
   * recomputes from `window.location.href` right after mount regardless, so
   * this is correct even when omitted or stale — it only prevents a same-URL
   * flash on first paint. (SSG pages don't have request context to compute
   * this server-side without opting the whole page out of static generation,
   * so the framework doesn't do that for you — see Canopy's page.tsx for the
   * "pass nothing, let it self-resolve client-side" default.)
   */
  pageUrl?: string;
  /**
   * Absolute URL of this site's own MCP endpoint (mount one via
   * `createMcpHandler()` from '@inkform/framework/mcp' — ARCHITECTURE.md
   * §8). Defaults to `${location.origin}/api/mcp`. Pass `null` to omit
   * "Connect to Cursor" / "Connect to VS Code" entirely, e.g. a site that
   * hasn't mounted an MCP route.
   */
  mcpUrl?: string | null;
  /** Shown to Cursor/VS Code as the installed MCP server's label. Defaults to 'Docs'. */
  siteName?: string;
  /** Section heading, or `null` to omit it (e.g. stacking under a TocList that already renders "On this page"). */
  title?: string | null;
  /**
   * Pre-rendered icon per tool (e.g. Lucide elements), keyed by `AiToolId`.
   * A plain ReactNode map rather than a `renderIcon` callback — this
   * component is a Client Component, and a live function prop can't cross
   * the Server → Client Component boundary from a page.tsx that builds this
   * server-side (confirmed the hard way: `next build` fails with "Functions
   * cannot be passed directly to Client Components" if you try). Build the
   * map once with real icons (e.g. a small constant in lib/icons.tsx) and
   * pass it down as data, the same way Sidebar/DocsShell's own `renderIcon`
   * convention resolves icons into ReactNode server-side before they ever
   * reach a component. Falls back to a small built-in glyph per tool for any
   * id not present in the map.
   */
  icons?: Partial<Record<AiToolId, React.ReactNode>>;
  /** Extra class name on the root <nav>. */
  className?: string;
}

/* ─────────────────────────────────────────────
   Link builders

   Verified 2026-07 against sequoia.mintlify.site's own production build —
   intercepted `window.open()` there rather than guessing, since its actions
   are onClick handlers, not plain <a href>. Findings behind each comment.
───────────────────────────────────────────── */

function buildPrompt(pageUrl: string): string {
  return `Read ${pageUrl} and help me understand it`;
}

/** Unicode-safe base64 (btoa() alone only handles Latin1) — guards a siteName with non-ASCII characters. */
function safeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function safeOrigin(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

function chatGptUrl(pageUrl: string): string {
  // https://chat.openai.com/?hints=search&q=<prompt> — `q` pre-fills (but
  // doesn't auto-submit) the composer. `hints=search` is undocumented but
  // present in Sequoia's real link; left in since it's what was observed
  // actually shipping, not a guess.
  return `https://chat.openai.com/?hints=search&q=${encodeURIComponent(buildPrompt(pageUrl))}`;
}

function claudeUrl(pageUrl: string): string {
  // https://claude.ai/new?q=<prompt> — same pre-fill convention as ChatGPT.
  return `https://claude.ai/new?q=${encodeURIComponent(buildPrompt(pageUrl))}`;
}

function perplexityUrl(pageUrl: string): string {
  return `https://www.perplexity.ai/search?q=${encodeURIComponent(buildPrompt(pageUrl))}`;
}

function grokUrl(pageUrl: string): string {
  // grok.com's `q` param isn't publicly documented anywhere findable, but it
  // demonstrably pre-fills the composer on Sequoia's real production site
  // (confirmed the same way as chatGptUrl above) — real and working, just
  // unofficial, unlike the other three.
  return `https://grok.com/?q=${encodeURIComponent(buildPrompt(pageUrl))}`;
}

function cursorDeeplink(siteName: string, mcpUrl: string): string {
  // Cursor's documented one-click MCP install deep link:
  //   cursor://anysphere.cursor-deeplink/mcp/install?name=<name>&config=<base64 JSON>
  // This deliberately does NOT open the doc page — it registers THIS SITE'S
  // OWN MCP server (see '@inkform/framework/mcp') in the reader's Cursor, so
  // they can point Cursor's agent at these docs directly. Chosen over a
  // guessed `cursor://open?url=...` scheme because this is what Sequoia's
  // real button actually does (confirmed by decoding its intercepted
  // window.open call) and it's a materially more useful feature.
  const config = safeBase64(JSON.stringify({ url: mcpUrl }));
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(siteName)}&config=${config}`;
}

function vscodeDeeplink(siteName: string, mcpUrl: string): string {
  // VS Code's documented MCP install URI: vscode:mcp/install?<url-encoded JSON>
  // — note the query segment IS the encoded JSON, not key=value pairs. Same
  // "install this site's MCP server" idea as cursorDeeplink above.
  return `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: siteName, url: mcpUrl }))}`;
}

/* ─────────────────────────────────────────────
   Default icons — dependency-free, brand-neutral (no framework package
   bundles an icon library; see ARCHITECTURE.md §5). A theme can pass real
   per-tool icons via `renderIcon`.
───────────────────────────────────────────── */

function CopyGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ExternalGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function defaultIcon(tool: AiToolId): React.ReactNode {
  return tool === 'copy' ? <CopyGlyph /> : <ExternalGlyph />;
}

/* ─────────────────────────────────────────────
   Copy-to-clipboard, with a fallback for contexts without the async
   Clipboard API (e.g. non-HTTPS dev over a LAN IP).
───────────────────────────────────────────── */

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path below
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  } catch {
    return false;
  }
}

/* ─────────────────────────────────────────────
   AiToolMenu
───────────────────────────────────────────── */

export function AiToolMenu({
  pageContent,
  pageUrl,
  mcpUrl,
  siteName = 'Docs',
  title = 'Ask AI',
  icons,
  className,
}: AiToolMenuProps): React.ReactNode {
  const [copied, setCopied] = React.useState(false);

  // See the `pageUrl` prop doc above: both the server pass and the first
  // client pass (before the effect below fires) render from the same
  // `pageUrl` fallback, so there's no hydration mismatch — the effect's
  // setState only triggers an ordinary post-hydration re-render, same as
  // any other client-only data (TocList's own scroll-spy state works the
  // same way).
  const [liveUrl, setLiveUrl] = React.useState<string | undefined>(pageUrl);
  const [liveOrigin, setLiveOrigin] = React.useState<string | undefined>(() => (pageUrl ? safeOrigin(pageUrl) : undefined));

  React.useEffect(() => {
    setLiveUrl(window.location.href);
    setLiveOrigin(window.location.origin);
  }, []);

  const resolvedUrl = liveUrl ?? '';
  const resolvedMcpUrl = mcpUrl === null ? null : (mcpUrl ?? (liveOrigin ? `${liveOrigin}/api/mcp` : null));

  async function handleCopy() {
    const ok = await copyText(pageContent || resolvedUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function icon(tool: AiToolId): React.ReactNode {
    return icons?.[tool] ?? defaultIcon(tool);
  }

  // Built once per render instead of hand-repeating six near-identical <li>
  // blocks — the promptable web tools and the MCP-install tools each gate on
  // a different prerequisite (a resolved page URL vs. a resolved MCP URL).
  const links: { id: AiToolId; label: string; href: string }[] = [];
  if (resolvedUrl) {
    links.push({ id: 'chatgpt', label: 'Open in ChatGPT', href: chatGptUrl(resolvedUrl) });
    links.push({ id: 'claude', label: 'Open in Claude', href: claudeUrl(resolvedUrl) });
  }
  if (resolvedMcpUrl) {
    links.push({ id: 'cursor', label: 'Connect to Cursor', href: cursorDeeplink(siteName, resolvedMcpUrl) });
    links.push({ id: 'vscode', label: 'Connect to VS Code', href: vscodeDeeplink(siteName, resolvedMcpUrl) });
  }
  if (resolvedUrl) {
    links.push({ id: 'perplexity', label: 'Open in Perplexity', href: perplexityUrl(resolvedUrl) });
    links.push({ id: 'grok', label: 'Open in Grok', href: grokUrl(resolvedUrl) });
  }

  return (
    <nav className={`fw-aitoolmenu${className ? ` ${className}` : ''}`} aria-label="AI tools">
      {title ? <p className="fw-aitoolmenu-title">{title}</p> : null}
      <ul className="fw-aitoolmenu-list">
        <li className="fw-aitoolmenu-item">
          <button
            type="button"
            className={`fw-aitoolmenu-link${copied ? ' fw-aitoolmenu-link--copied' : ''}`}
            onClick={() => void handleCopy()}
          >
            <span className="fw-aitoolmenu-icon">{copied ? <CheckGlyph /> : icon('copy')}</span>
            <span className="fw-aitoolmenu-label">{copied ? 'Copied!' : 'Copy page'}</span>
          </button>
        </li>
        {links.map((l) => (
          <li key={l.id} className="fw-aitoolmenu-item">
            <a className="fw-aitoolmenu-link" href={l.href} target="_blank" rel="noopener noreferrer">
              <span className="fw-aitoolmenu-icon">{icon(l.id)}</span>
              <span className="fw-aitoolmenu-label">{l.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
