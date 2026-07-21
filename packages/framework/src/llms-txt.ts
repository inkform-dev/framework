/**
 * llms.txt / llms-full.txt — the emerging convention (https://llmstxt.org)
 * for giving LLMs and agentic tools a plain-text entry point into a site's
 * content without needing to render or crawl HTML.
 *
 * buildLlmsTxt() is a curated index: title, one-line summary, and grouped
 * markdown links to docs / API operations / changelog / blog. buildLlmsFullTxt()
 * is the whole corpus concatenated — every doc page's MDX body, the full
 * OpenAPI spec as Markdown (via the same openapi-engine renderer the MCP
 * server's get_operation/search tools use), every changelog entry, every
 * blog post.
 */

import { loadBlogPosts, loadChangelogEntries, loadDocPage, loadDocsConfig } from './content';
import { loadApiDocument } from './mcp/tools';
import { listDocPages } from './nav';
import { renderOpenApiMarkdown } from './openapi-engine/markdown';
import { buildNavTree } from './openapi-engine/nav';

export interface LlmsTxtOptions {
  /**
   * The app's API Reference tab base path, e.g. "/api-reference" (the app's
   * own DocsTab slug). Callers compute this from their own docs.json —
   * framework code stays decoupled from any one app's routing. Defaults to
   * "/api-reference", matching ai/ask.ts's convention.
   */
  apiBasePath?: string;
}

function section(title: string, lines: string[]): string {
  return lines.length > 0 ? `## ${title}\n\n${lines.join('\n')}` : '';
}

function pageDescription(file: string): string {
  const loaded = loadDocPage(file);
  const desc = loaded?.data.description;
  return typeof desc === 'string' ? desc : '';
}

/** Curated index: title, summary, and grouped links to key pages. */
export async function buildLlmsTxt(options: LlmsTxtOptions = {}): Promise<string> {
  const config = loadDocsConfig();
  if (!config) return '';

  const apiBasePath = options.apiBasePath ?? '/api-reference';
  const parts: string[] = [`# ${config.name}`, '', `> Documentation for ${config.name}.`];

  const docLines = listDocPages(config).map((page) => {
    const desc = pageDescription(page.file);
    return `- [${page.title}](/${page.slug})${desc ? `: ${desc}` : ''}`;
  });
  parts.push(section('Docs', docLines));

  const document = await loadApiDocument();
  if (document) {
    const tree = buildNavTree(document);
    const opLines = tree.tagGroups.flatMap((group) =>
      group.operations.map(
        (op) =>
          `- [${op.summary || op.operationId}](${apiBasePath}/operations/${op.operationId}): ${op.method.toUpperCase()} ${op.path}`,
      ),
    );
    parts.push(section('API Reference', opLines));
  }

  if (loadChangelogEntries().length > 0) {
    parts.push(section('Changelog', ['- [Changelog](/changelog)']));
  }

  const blogLines = loadBlogPosts().map(
    (post) => `- [${post.title}](/blog/${post.slug})${post.description ? `: ${post.description}` : ''}`,
  );
  parts.push(section('Blog', blogLines));

  return parts.filter(Boolean).join('\n\n').trimEnd() + '\n';
}

/** The whole corpus concatenated: every doc page, the full API spec, every changelog entry and blog post. */
export async function buildLlmsFullTxt(): Promise<string> {
  const config = loadDocsConfig();
  if (!config) return '';

  const parts: string[] = [`# ${config.name}`];

  for (const page of listDocPages(config)) {
    const loaded = loadDocPage(page.file);
    if (loaded) parts.push(`# ${page.title}\n\n${loaded.content.trim()}`);
  }

  const document = await loadApiDocument();
  if (document) {
    parts.push(`# API Reference\n\n${renderOpenApiMarkdown(document).trim()}`);
  }

  const changelog = loadChangelogEntries();
  if (changelog.length > 0) {
    const entries = changelog.map((e) => `## ${e.title}${e.date ? ` — ${e.date}` : ''}\n\n${e.content.trim()}`);
    parts.push(`# Changelog\n\n${entries.join('\n\n')}`);
  }

  const posts = loadBlogPosts();
  if (posts.length > 0) {
    const entries = posts.map((p) => `## ${p.title}${p.date ? ` — ${p.date}` : ''}\n\n${p.content.trim()}`);
    parts.push(`# Blog\n\n${entries.join('\n\n')}`);
  }

  return parts.join('\n\n---\n\n').trimEnd() + '\n';
}
