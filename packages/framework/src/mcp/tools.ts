/**
 * Shared MCP tool core — search, get_operation, list_operations, get_doc.
 * Pure data functions, no MCP-protocol-specific shapes (server.ts wraps
 * these as actual MCP tools). BYO-config: reads the same content/docs.json
 * convention every other part of the framework already uses, zero required
 * env vars.
 *
 * search() does NOT reuse Pagefind's index, despite that being the original
 * plan's assumption — checked first: the `pagefind` npm package's Node API
 * (createIndex/addHTMLFile/writeFiles) is index-BUILDING only, with no
 * server-side query function. Pagefind's actual search runs in the browser
 * via a generated WASM runtime, which a Node MCP route handler can't drive.
 * Real search here instead, over the same underlying content (doc pages +
 * operation markdown), via fuse.js (already proven elsewhere in this
 * research: zero dependencies, the same library Scalar's own in-browser
 * search uses).
 */

import Fuse from 'fuse.js';
import { loadDocPage, loadDocsConfig, loadOpenApiSpecForBuild } from '../content';
import { docTabs, findDocPage, listDocPages } from '../nav';
import { renderOperationMarkdown } from '../openapi-engine/markdown';
import { buildNavTree } from '../openapi-engine/nav';
import { parseOpenApiDocument } from '../openapi-engine/parse';

/** Loads + bundles + dereferences the configured OpenAPI spec, if any. Null if no spec is configured. */
export async function loadApiDocument(): Promise<Record<string, unknown> | null> {
  const config = loadDocsConfig();
  if (!config) return null;
  const apiTab = docTabs(config).find((t) => !!t.openapi);
  if (!apiTab?.openapi) return null;
  const spec = await loadOpenApiSpecForBuild(apiTab.openapi);
  if (!spec) return null;
  const { schema } = await parseOpenApiDocument(spec.raw, { format: spec.format });
  return schema;
}

// ── search ───────────────────────────────────────────────────────────────────

interface SearchableRecord {
  type: 'doc' | 'operation';
  title: string;
  /** Doc slug, or operationId. */
  id: string;
  content: string;
}

export interface McpSearchResult {
  type: 'doc' | 'operation';
  title: string;
  id: string;
  excerpt: string;
}

function excerptAround(content: string, query: string, radius = 80): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  const lower = normalized.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  let idx = -1;
  for (const w of words) {
    const found = lower.indexOf(w);
    if (found !== -1 && (idx === -1 || found < idx)) idx = found;
  }

  if (idx === -1) {
    const clipped = normalized.slice(0, radius * 2).trim();
    return clipped + (normalized.length > clipped.length ? '…' : '');
  }

  const start = Math.max(0, idx - radius);
  const end = Math.min(normalized.length, idx + radius);
  return (start > 0 ? '…' : '') + normalized.slice(start, end).trim() + (end < normalized.length ? '…' : '');
}

async function loadSearchableContent(): Promise<SearchableRecord[]> {
  const config = loadDocsConfig();
  if (!config) return [];

  const records: SearchableRecord[] = [];
  for (const page of listDocPages(config)) {
    const loaded = loadDocPage(page.file);
    if (loaded) records.push({ type: 'doc', title: page.title, id: page.slug, content: loaded.content });
  }

  const document = await loadApiDocument();
  if (document) {
    const tree = buildNavTree(document);
    for (const group of tree.tagGroups) {
      for (const op of group.operations) {
        const markdown = renderOperationMarkdown(document, { path: op.path, method: op.method });
        records.push({ type: 'operation', title: op.summary, id: op.operationId, content: markdown });
      }
    }
  }

  return records;
}

/** Fuzzy search across MDX doc pages and API operations in one ranked result list. */
export async function search(query: string, limit = 10): Promise<McpSearchResult[]> {
  const records = await loadSearchableContent();
  const fuse = new Fuse(records, {
    keys: [
      { name: 'title', weight: 2 },
      { name: 'content', weight: 1 },
    ],
    // Natural-language questions ("What does the id field mean?") don't
    // match well as one whole fuzzy-matched string against short
    // titles/long content — threshold-tuning alone couldn't fix this
    // without over-loosening keyword-style queries too. useTokenSearch
    // splits multi-word queries into individual terms, fuzzy-matches each
    // independently, and uses BM25-style IDF weighting, so common words
    // ("what", "does", "the") naturally rank lower without a hand-rolled
    // stopword list. Confirmed via a real query this framework's own ask-box
    // needed to handle correctly (see ai/ask.test.ts).
    useTokenSearch: true,
    threshold: 0.4,
    ignoreLocation: true,
  });

  return fuse.search(query, { limit }).map(({ item }) => ({
    type: item.type,
    title: item.title,
    id: item.id,
    excerpt: excerptAround(item.content, query),
  }));
}

// ── get_operation / list_operations ─────────────────────────────────────────

/** Renders one operation as Markdown by operationId. Null if no spec is configured or the operation doesn't exist. */
export async function getOperation(operationId: string): Promise<string | null> {
  const document = await loadApiDocument();
  if (!document) return null;
  const markdown = renderOperationMarkdown(document, { operationId });
  return markdown || null;
}

export interface McpOperationSummary {
  operationId: string;
  method: string;
  path: string;
  summary: string;
  tag: string;
}

/** Lists every operation in the configured spec (empty array if none is configured). */
export async function listOperations(): Promise<McpOperationSummary[]> {
  const document = await loadApiDocument();
  if (!document) return [];

  const tree = buildNavTree(document);
  const out: McpOperationSummary[] = [];
  for (const group of tree.tagGroups) {
    for (const op of group.operations) {
      out.push({ operationId: op.operationId, method: op.method, path: op.path, summary: op.summary, tag: group.tag });
    }
  }
  return out;
}

// ── get_doc ──────────────────────────────────────────────────────────────────

/** Returns a doc page's raw MDX body content by slug. Null if not found. */
export async function getDoc(slug: string): Promise<string | null> {
  const config = loadDocsConfig();
  if (!config) return null;
  const page = findDocPage(config, slug);
  if (!page) return null;
  const loaded = loadDocPage(page.file);
  return loaded?.content ?? null;
}
