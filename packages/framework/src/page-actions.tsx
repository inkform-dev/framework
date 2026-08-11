'use client';

import * as React from 'react';
import { AI_TOOLS, buildAiToolAction, safeOrigin, type AiToolAction, type AiToolId } from './ai-tools';
import { defaultAiToolIcons } from './ai-tool-icons';
import { Confetti } from './confetti';
import { CopyGlyph, CheckGlyph, ExternalGlyph, TextGlyph } from './glyphs';
import { copyText } from './clipboard';

/**
 * Per-page actions: "Copy as Markdown" and an "Open" menu (view the raw
 * Markdown, or hand the page to ChatGPT/Claude/Cursor/…).
 *
 * These are the page-level companions to the framework's `*.md` endpoint
 * (see ./markdown.ts): `MarkdownCopyButton` fetches the page's own `.md`
 * document and puts it on the clipboard, and `ViewOptionsPopover` links to
 * the same `.md` URL plus the AI tools.
 *
 * Both are Client Components and take only serializable props (an `icons`
 * map of pre-rendered ReactNode per tool, mirroring AiToolMenu — a live
 * function prop can't cross the Server → Client boundary). Tools without an
 * entry fall back to a monochrome brand mark per tool (./ai-tool-icons).
 */

/* ─────────────────────────────────────────────
   MarkdownCopyButton
───────────────────────────────────────────── */

// Cache the fetched Markdown per URL so copying the same page twice doesn't
// refetch. Keyed by the URL string; a module-level map like SearchDialog's
// pagefindPromise. Only successful responses are cached — a failure leaves
// the key unset so a later copy can retry.
const markdownCache = new Map<string, Promise<string>>();

function fetchMarkdown(url: string): Promise<string> {
  return fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.text();
  });
}

export interface MarkdownCopyButtonProps {
  /**
   * URL of this page's Markdown document, e.g. `/quickstart.md`. Fetched and
   * copied verbatim.
   */
  markdownUrl: string;
  /** Button label. Defaults to "Copy Markdown". */
  label?: string;
  /** Pre-rendered icon; falls back to a small built-in glyph. */
  icon?: React.ReactNode;
  /** Extra class name on the <button>. */
  className?: string;
}

/**
 * Fetches this page's Markdown (`markdownUrl`) and copies it to the
 * clipboard. Cached per URL; shows a check briefly after a successful copy.
 */
export function MarkdownCopyButton({
  markdownUrl,
  label = 'Copy Markdown',
  icon,
  className,
}: MarkdownCopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleCopy() {
    if (loading) return;
    setLoading(true);
    try {
      let promise = markdownCache.get(markdownUrl);
      if (!promise) {
        promise = fetchMarkdown(markdownUrl);
        markdownCache.set(markdownUrl, promise);
        // Keep failures out of the cache so a later click retries the fetch
        // instead of permanently re-copying the stale rejected promise.
        promise.catch(() => {
          markdownCache.delete(markdownUrl);
        });
      }
      const ok = await copyText(await promise);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // fetch failed — nothing to copy; leave the button unchanged
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={`fw-page-action${className ? ` ${className}` : ''}`}
      onClick={() => void handleCopy()}
      disabled={loading}
      aria-label={copied ? 'Copied' : label}
      title={label}
    >
      <span className="fw-page-action-icon" aria-hidden>
        {copied ? <CheckGlyph /> : (icon ?? <CopyGlyph />)}
        {copied ? <Confetti /> : null}
      </span>
      <span className="fw-page-action-label">
        <span className="fw-page-action-label-reserve" aria-hidden="true">Copied Markdown</span>
        <span className="fw-page-action-label-active">{copied ? 'Copied Markdown' : label}</span>
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────
   ViewOptionsPopover
───────────────────────────────────────────── */

export interface ViewOptionsPopoverProps {
  /**
   * URL of this page's Markdown document, e.g. `/quickstart.md`. Renders the
   * "View as Markdown" entry. Omit to hide it.
   */
  markdownUrl?: string;
  /** Absolute URL of the page itself — used to build the AI-tool prompt links. */
  pageUrl?: string;
  /** Source file URL on GitHub, e.g. `https://github.com/…/blob/…/quickstart.mdx`. */
  githubUrl?: string;
  /**
   * Absolute URL of this site's own MCP endpoint (mount one via
   * `createMcpHandler()` from '@inkform/framework/mcp'). Defaults to
   * `${origin}/api/mcp`. Pass `null` to omit the Cursor/VS Code entries.
   */
  mcpUrl?: string | null;
  /** Shown to Cursor/VS Code as the installed MCP server's label. Defaults to 'Docs'. */
  siteName?: string;
  /** Trigger button label. Defaults to "Open". */
  triggerLabel?: string;
  /**
   * Pre-rendered icon per AI tool (e.g. icon-library elements), keyed by `AiToolId`.
   * Mirrors AiToolMenu's `icons` prop; falls back to built-in brand marks.
   * The non-AI rows ("View as Markdown", "Open in GitHub") always use their
   * built-in glyphs.
   */
  icons?: Partial<Record<AiToolId, React.ReactNode>>;
  /** Extra class name on the wrapper. */
  className?: string;
}

/**
 * An "Open" dropdown with a "View as Markdown" link (the page's own `.md`
 * document) and "hand this page to an AI tool" links — ChatGPT, Claude,
 * Cursor, VS Code, Perplexity, Grok — reusing the same URL builders as
 * AiToolMenu. Closes on Escape or an outside click.
 */
export function ViewOptionsPopover({
  markdownUrl,
  pageUrl,
  githubUrl,
  mcpUrl,
  siteName = 'Docs',
  triggerLabel = 'Open',
  icons,
  className,
}: ViewOptionsPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Page URL resolves client-side (SSG pages have no request context), same
  // as AiToolMenu — `pageUrl` only prevents a brief blank before mount.
  const [liveUrl, setLiveUrl] = React.useState<string | undefined>(pageUrl);
  const [liveOrigin, setLiveOrigin] = React.useState<string | undefined>(() =>
    pageUrl ? safeOrigin(pageUrl) : undefined,
  );

  React.useEffect(() => {
    setLiveUrl(window.location.href);
    setLiveOrigin(window.location.origin);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  const resolvedUrl = liveUrl ?? '';
  const resolvedMcpUrl = mcpUrl === null ? null : (mcpUrl ?? (liveOrigin ? `${liveOrigin}/api/mcp` : null));

  // Two groups: websites (github/markdown + prompt-based AI tools) and local
  // tools (MCP installs for editors + copy-a-command CLIs). Split by registry
  // kind so the menu can lay them out as two columns.
  interface MenuRow {
    id: string;
    label: string;
    action: { type: 'link'; href: string } | { type: 'command'; command: string };
  }
  const items: MenuRow[] = [];
  const localItems: MenuRow[] = [];
  if (githubUrl) items.push({ id: 'github', label: 'Open in GitHub', action: { type: 'link', href: githubUrl } });
  if (markdownUrl) items.push({ id: 'markdown', label: 'View as Markdown', action: { type: 'link', href: markdownUrl } });
  for (const tool of AI_TOOLS) {
    const action = buildAiToolAction(tool, {
      pageUrl: resolvedUrl,
      mcpUrl: resolvedMcpUrl ?? undefined,
      siteName,
    });
    if (action === null) continue;
    const entry: MenuRow = { id: tool.id, label: tool.label, action };
    if (tool.kind === 'mcp' || tool.kind === 'command') localItems.push(entry);
    else items.push(entry);
  }

  // Copied-state for command rows; keyed by tool id so only the clicked one flips.
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  async function runAction(row: MenuRow) {
    if (row.action.type !== 'command') return;
    const ok = await copyText(row.action.command);
    if (ok) {
      setCopiedId(row.id);
      setTimeout(() => setCopiedId((c) => (c === row.id ? null : c)), 1500);
    }
  }

  function icon(id: string, isCommand: boolean): React.ReactNode {
    const key = id as AiToolId;
    if (icons?.[key]) return icons[key] as React.ReactNode;
    if (defaultAiToolIcons[key]) return defaultAiToolIcons[key] as React.ReactNode;
    if (isCommand) return <CopyGlyph />;
    if (id === 'markdown') return <TextGlyph />;
    return <ExternalGlyph />;
  }

  function renderRow(row: MenuRow) {
    if (row.action.type === 'command') {
      const copied = copiedId === row.id;
      return (
        <button
          key={row.id}
          type="button"
          role="menuitem"
          className="fw-page-action-menu-item"
          onClick={() => void runAction(row)}
        >
          <span className="fw-page-action-menu-icon" aria-hidden>
            {copied ? <CheckGlyph /> : icon(row.id, true)}
            {copied ? <Confetti /> : null}
          </span>
          <span className="fw-page-action-menu-label">{copied ? 'Copied command' : row.label}</span>
        </button>
      );
    }
    return (
      <a
        key={row.id}
        role="menuitem"
        href={row.action.href}
        target="_blank"
        rel="noreferrer noopener"
        className="fw-page-action-menu-item"
      >
        <span className="fw-page-action-menu-icon" aria-hidden>
          {icon(row.id, false)}
        </span>
        <span className="fw-page-action-menu-label">{row.label}</span>
      </a>
    );
  }

  return (
    <div ref={rootRef} className={`fw-page-action-group${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className={`fw-page-action${open ? ' fw-page-action--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={triggerLabel}
        title={triggerLabel}
      >
        <span className="fw-page-action-label">{triggerLabel}</span>
        <svg className="fw-page-action-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="fw-page-action-menu" role="menu" aria-label={triggerLabel}>
          <div className="fw-page-action-menu-col" role="none">
            {items.map(renderRow)}
          </div>
          {localItems.length > 0 ? (
            <div className="fw-page-action-menu-col" role="none">
              {localItems.map(renderRow)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PageActions — both buttons in one row
───────────────────────────────────────────── */

export interface PageActionsProps extends ViewOptionsPopoverProps {
  /** URL of this page's Markdown document, e.g. `/quickstart.md`. */
  markdownUrl: string;
  /** Label for the copy button. Defaults to "Copy Markdown". */
  copyLabel?: string;
  /** Pre-rendered copy icon. */
  copyIcon?: React.ReactNode;
  /**
   * Page title, rendered as the H1 above the buttons. The page's own MDX
   * normally carries the `# H1` — pass the title here AND strip the leading
   * H1 from the MDX source to avoid a duplicate.
   */
  title?: string;
}

/**
 * The two page-level actions side by side: Copy as Markdown + Open.
 *
 * ```tsx
 * <PageActions
 *   title={ref.title}
 *   markdownUrl={`/${ref.slug}.md`}
 *   githubUrl={`https://github.com/${owner}/${repo}/blob/main/content/docs/${ref.file}`}
 * />
 * ```
 */
export function PageActions(props: PageActionsProps) {
  const { title, markdownUrl, copyLabel, copyIcon, className, ...popoverProps } = props;
  return (
    <div className={`fw-page-actions${className ? ` ${className}` : ''}`}>
      {title ? <h1 className="fw-page-title">{title}</h1> : null}
      <div className="fw-page-action-row">
        <MarkdownCopyButton markdownUrl={markdownUrl} label={copyLabel} icon={copyIcon} />
        <ViewOptionsPopover markdownUrl={markdownUrl} {...popoverProps} />
      </div>
    </div>
  );
}
