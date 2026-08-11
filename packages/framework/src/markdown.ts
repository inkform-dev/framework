/**
 * @inkform/framework — per-page Markdown (`*.md`).
 *
 * Any page on the site is also reachable as a single Markdown document by
 * appending `.md` to its own URL: `/quickstart.md`, `/index.md`,
 * `/concepts/pagination.md`, `/api-reference/operations/get-pokemon.md`. A
 * middleware rewrite (in the app's `proxy.ts`) maps those `.md` URLs onto the
 * internal markdown route; the public URL keeps its `.md` suffix.
 *
 * Three pieces:
 *
 * 1. `processMarkdown()` — converts an MDX source string (the body an author
 *    commits, e.g. `loadDocPage().content`) into a cleaned, LLM-readable
 *    Markdown string. It parses with the SAME plugins `<Mdx>` renders with
 *    (remark-gfm, remark-directive, remark-mdx) and re-stringifies the
 *    resulting mdast via `mdast-util-to-markdown` — deliberately NOT a regex
 *    strip, which would silently lose data-bearing components.
 *
 *    Component policy — structural, no hardcoded component or attribute
 *    names (the site's own widgets are unknown to this package):
 *    - `mdxjsEsm` (imports/exports) → removed. This is the "a component that
 *      imports another component / another .mdx" answer: the import machinery
 *      disappears, but every `<Thing />` *use site* stays in the output.
 *    - `:::callout` directives → blockquote (the closest markdown-native
 *      shape for what `<Mdx>` maps onto `<Callout>`).
 *    - A component WITH children → a wrapper; only the inner content is kept.
 *      If any attribute value looks like a URL (by value — `href`, `url`,
 *      `src`, anything), it's surfaced as a markdown link; if one reads as a
 *      human label (contains a space or uppercase), it's surfaced as bold.
 *    - A self-closing component (no children) → the JSX tag is kept with its
 *      attributes, since props are its only content: `<Playground
 *      template="react" />`, `<ApiReference endpoint="GET /pokemon" />`. `{expr}`
 *      expressions are left as-is (unresolvable without executing the
 *      component).
 *
 * 2. `buildMarkdownPage()` — resolves a slug to the Markdown for ONE page:
 *    a doc page, an API operation (`<apiBase>/operations/<operationId>`), a
 *    blog post, or a changelog entry. The per-page counterpart to
 *    `buildLlmsFullTxt()` (whole corpus) and the MCP tools' `getDoc()`.
 *    Each page starts with a `# title` header; the page's own URL is implied
 *    by the `.md` request itself, so no URL is echoed in the body.
 *
 * 3. `createMarkdownHandler()` — a Next.js route-handler factory (mirrors
 *    `createMcpHandler`). Mount it at `app/markdown/[[...slug]]/route.ts` and
 *    have the app's `proxy.ts` rewrite `/<slug>.md` URLs onto it (see the
 *    function's own docstring for the mount snippet). Unknown pages return
 *    a plain 404.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkMdx from 'remark-mdx';
import { toMarkdown } from 'mdast-util-to-markdown';
import { gfmToMarkdown } from 'mdast-util-gfm';
import { mdxToMarkdown } from 'mdast-util-mdx';
import { mdxJsxToMarkdown } from 'mdast-util-mdx-jsx';
import { visit } from 'unist-util-visit';
import type { Node, Root } from 'mdast';
import { loadBlogPost, loadChangelogEntries, loadDocPage, loadDocsConfig, stripLeadingH1 } from './content';
import { findDocPage } from './nav';
import { loadApiDocument } from './mcp/tools';
import { renderOperationMarkdown } from './openapi-engine/markdown';

/**
 * First attribute value that looks like a URL — detected by VALUE, not by
 * attribute name (so `href`, `url`, `src`, a custom prop, anything). Used to
 * surface a component's destination as a real markdown link instead of dead
 * text (e.g. a `<Card>` with an `href`).
 */
function wrapperUrl(node: { attributes?: unknown[] }): string | undefined {
  for (const raw of node.attributes ?? []) {
    const attr = raw as { value?: unknown };
    if (typeof attr.value !== 'string') continue;
    const v = attr.value;
    // anchor, relative path, or absolute URL — not bare text like "unlock"
    if (/^(#|\/|\.\/|https?:\/\/|mailto:)/.test(v)) return v;
  }
  return undefined;
}

/**
 * First attribute value that reads as a human label — a space or an
 * uppercase letter (e.g. `title="No auth required"`, `caption="…"`). Bare
 * identifiers like `type="info"` or `icon="unlock"` are skipped: they're
 * variants/decoration, not content. Detected by value, not by name.
 */
function label(node: { attributes?: unknown[] }): string | undefined {
  for (const raw of node.attributes ?? []) {
    const attr = raw as { value?: unknown };
    if (typeof attr.value !== 'string') continue;
    const v = attr.value;
    if (/^(#|\/|\.\/|https?:\/\/|mailto:)/.test(v)) continue; // it's a URL
    if (/[A-Z\s]/.test(v) && v.length <= 80) return v;
  }
  return undefined;
}

/** mdast-util-mdx-jsx's own to-markdown handlers, so we can delegate to them. */
const mdxJsxHandlers = mdxJsxToMarkdown().handlers!;
const mdxFlowHandler = mdxJsxHandlers.mdxJsxFlowElement!;
const mdxTextHandler = mdxJsxHandlers.mdxJsxTextElement!;

/**
 * Pre-stringify transforms that are easier expressed as tree edits than as
 * toMarkdown handlers:
 * - drop `mdxjsEsm` (imports/exports are machinery, not content)
 * - `:::callout` directives → blockquote
 * - leaf/text directives → their children (or drop when empty)
 */
function remarkPlainMarkdown() {
  return (tree: Root) => {
    visit(tree, (node, index, parent) => {
      if (!parent || index === undefined) return;
      const n = node as unknown as { type: string; children?: Node[] };

      switch (n.type) {
        case 'mdxjsEsm':
          (parent.children as unknown[]).splice(index, 1);
          return;
        case 'containerDirective': {
          // `:::info … :::` maps to <Callout type="info"> when rendered; the
          // closest markdown-native shape is a blockquote.
          const directive = n as { type: string; name?: unknown; attributes?: unknown };
          directive.type = 'blockquote';
          delete directive.name;
          delete directive.attributes;
          return;
        }
        case 'leafDirective':
        case 'textDirective': {
          const children = (n.children ?? []) as Node[];
          // Replace the directive node with its children (or drop it). Spliced
          // in place so `visit`'s index stays valid for the remaining siblings.
          (parent.children as Node[]).splice(index, 1, ...children);
          return;
        }
      }
    });
  };
}

/**
 * Convert an MDX source string into cleaned, LLM-readable Markdown. See the
 * module docstring for the component policy. Pure — no IO.
 */
export function processMarkdown(source: string): string {
  // `.parse()` only runs the parsers; the transformer plugins (remarkGfm's
  // table/task handling, remarkDirective, remarkPlainMarkdown) run in
  // `.run()` — so parse first, then run the transformers, then stringify.
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkPlainMarkdown);

  const tree = processor.runSync(processor.parse(source) as Root) as Root;

  const markdown = toMarkdown(tree, {
    extensions: [gfmToMarkdown(), mdxToMarkdown()],
    handlers: {
      mdxJsxFlowElement(node, parent, state, info) {
        // No children → self-closing data component (e.g. <Playground
        // template="react" />) — keep its tag, props are the content.
        if (node.children.length === 0) {
          return mdxFlowHandler(node, parent, state, info);
        }
        // Has children → a wrapper; keep the inner content. If an attribute
        // carries a URL (by value), surface it as a link; if one carries a
        // human-readable label (by value), surface it as bold text.
        const url = wrapperUrl(node);
        const text = label(node);
        const head = text ? (url ? `**[${text}](${url})**` : `**${text}**`) : url ? `[${url}](${url})` : '';
        const body = state.containerFlow(node, info);
        return head ? `${head}\n\n${body}` : body;
      },
      mdxJsxTextElement(node, parent, state, info) {
        if (node.children.length === 0) {
          return mdxTextHandler(node, parent, state, info);
        }
        const url = wrapperUrl(node);
        const text = label(node);
        const head = text ? (url ? `**[${text}](${url})**` : `**${text}**`) : url ? `[${url}](${url})` : '';
        const body = state.containerPhrasing(node, info);
        return head ? `${head} ${body}` : body;
      },
    },
  });

  return markdown.trim().replace(/\n{3,}/g, '\n\n') + '\n';
}

// ── buildMarkdownPage ────────────────────────────────────────────────────────

export interface BuildMarkdownPageOptions {
  /**
   * The app's API Reference tab slug, e.g. "api-reference", used to resolve
   * `<apiBase>/operations/<operationId>` URLs. Callers compute this from
   * their own docs.json (see each app's `lib/route.ts` `apiBasePath`) — same
   * convention as `ai/ask.ts` and `llms-txt.ts`; the framework stays decoupled
   * from any one app's routing. Defaults to "api-reference".
   */
  apiBasePath?: string;
}

function composePage(title: string, description: string | null, content: string): string {
  const parts = [`# ${title}`];
  if (description) parts.push('', description);
  parts.push('', stripLeadingH1(content).trim());
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/**
 * Resolve a slug to the Markdown for one page. Order of resolution:
 * API operation → blog post → changelog entry → doc page (the docs nav owns
 * every other slug; the index page is the empty string). Returns null when
 * the slug matches nothing.
 */
export async function buildMarkdownPage(
  slug: string,
  options: BuildMarkdownPageOptions = {},
): Promise<string | null> {
  const config = loadDocsConfig();
  if (!config) return null;

  const apiBase = (options.apiBasePath ?? 'api-reference').replace(/^\/+|\/+$/g, '');
  // Next.js serves /index as an alias of the root page; resolve it to the
  // index slug here so /index.md maps to the index page.
  const normalizedSlug = slug === 'index' ? '' : slug;
  const segments = normalizedSlug.split('/').filter(Boolean);

  // API operation — <apiBase>/operations/<operationId>.
  if (segments[0] === apiBase && segments[1] === 'operations' && segments.length >= 3) {
    const operationId = segments.slice(2).join('/');
    const document = await loadApiDocument();
    if (!document) return null;
    const markdown = renderOperationMarkdown(document, { operationId });
    if (!markdown) return null;
    const info = document.info as { title?: unknown } | undefined;
    const title = typeof info?.title === 'string' ? info.title : 'API Reference';
    return composePage(title, null, markdown);
  }

  // Blog post — blog/<postSlug>.
  if (segments[0] === 'blog' && segments.length === 2) {
    const post = loadBlogPost(segments[1]);
    if (!post) return null;
    return composePage(post.title, post.description, processMarkdown(post.content));
  }

  // Changelog entry — changelog/<slug> (entries render on the single /changelog page).
  if (segments[0] === 'changelog' && segments.length === 2) {
    const entry = loadChangelogEntries().find((e) => e.slug === segments[1]);
    if (!entry) return null;
    return composePage(entry.title, entry.version, processMarkdown(entry.content));
  }

  // Doc page — the docs nav owns every other slug ('' = index).
  const page = findDocPage(config, normalizedSlug);
  if (!page) return null;
  const loaded = loadDocPage(page.file);
  if (!loaded) return null;
  const description = typeof loaded.data.description === 'string' ? loaded.data.description : null;
  return composePage(page.title, description, processMarkdown(loaded.content));
}

// ── createMarkdownHandler ────────────────────────────────────────────────────

export interface CreateMarkdownHandlerOptions extends BuildMarkdownPageOptions {}

/**
 * Creates a Next.js route-handler-shaped function. Uses Next's own
 * `[[...slug]]` params — the same mechanism Next uses to route pages — rather
 * than parsing the URL, so the markdown endpoint and the docs page agree on
 * which "file" a path resolves to.
 *
 * Mount it at `app/markdown/[[...slug]]/route.ts`:
 *
 * ```ts
 * import { createMarkdownHandler } from '@inkform/framework/markdown';
 * import { apiBasePath, loadDocsConfig } from '@/lib/route';
 *
 * export const runtime = 'nodejs';
 *
 * const config = loadDocsConfig();
 * const apiBase = config && apiBasePath(config);
 * export const GET = createMarkdownHandler({ apiBasePath: apiBase ?? undefined });
 * ```
 *
 * The app's `proxy.ts` rewrites any `/<slug>.md` URL onto this route (the
 * public URL keeps its `.md` suffix), so `/quickstart.md`, `/index.md`, and
 * `/concepts/pagination.md` map to the same pages as `/quickstart`, `/`, and
 * `/concepts/pagination`. Unknown pages return a plain 404.
 */
export function createMarkdownHandler(options: CreateMarkdownHandlerOptions = {}) {
  return async (
    _request: Request,
    context: { params: Promise<{ slug?: string[] }> },
  ): Promise<Response> => {
    const { slug = [] } = await context.params;
    const markdown = await buildMarkdownPage(slug.join('/'), options);
    if (markdown === null) return new Response('Not Found', { status: 404 });
    return new Response(markdown, {
      headers: { 'content-type': 'text/markdown; charset=utf-8' },
    });
  };
}
