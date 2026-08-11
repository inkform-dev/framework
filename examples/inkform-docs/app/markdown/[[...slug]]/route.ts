import { createMarkdownHandler } from '@inkform/framework/markdown';
import { apiBasePath, loadDocsConfig } from '@/lib/route';

export const runtime = 'nodejs';

/**
 * GET <slug>.md — any page as Markdown, served at the page's own URL plus a
 * `.md` extension (e.g. /getting-started/quickstart.md). Index = /index.md.
 * API operations resolve as /<apiBase>/operations/<operationId>.md; blog and
 * changelog entries as /blog/<slug>.md and /changelog/<slug>.md. Unknown
 * pages 404.
 */
const config = loadDocsConfig();
const apiBase = config && apiBasePath(config);

export const GET = createMarkdownHandler({ apiBasePath: apiBase ?? undefined });
