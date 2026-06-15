/**
 * @freewrite-cms/framework — root entry.
 *
 * A standalone toolkit for building documentation, blog, and changelog sites
 * with Next.js + MDX. Only PURE / shared exports live here (no node:fs, no
 * 'use client'), so this is safe to import from anywhere. Import the rest from
 * their subpaths to keep client bundles clean:
 *
 *   server:  '@freewrite-cms/framework/content'        — loadDocsConfig, loadOpenApiSpec, …
 *            '@freewrite-cms/framework/mdx'             — <Mdx />
 *            '@freewrite-cms/framework/components'      — Callout, Card, Tabs, Steps, …
 *   layout:  '@freewrite-cms/framework/docs-shell'      — <DocsShell />, <Sidebar />, <TocList />
 *            '@freewrite-cms/framework/api-reference'    — <ApiReferenceView />, <ApiPlayground />
 *   client:  '@freewrite-cms/framework/search-dialog'    — <SearchDialog />
 *            '@freewrite-cms/framework/ask-ai'           — <AskAi /> (feature-flagged)
 *            '@freewrite-cms/framework/theme-toggle'     — <ThemeToggle />
 *   styles:  '@freewrite-cms/framework/styles.css'
 */
export * from './nav';
export * from './openapi';
export { buildSearchIndex } from './search';
export type { SearchDoc } from './search';
export { resolveSlugRedirect } from './slug-history';

export const FRAMEWORK_VERSION = '0.2.0';
