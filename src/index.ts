/**
 * @devsforfun/freewrite-framework — root entry.
 *
 * Only PURE / shared exports live here (no node:fs, no 'use client'), so this
 * is safe to import from anywhere. Import the rest from their subpaths to keep
 * client bundles clean:
 *
 *   server:  '@devsforfun/freewrite-framework/content'  — loadBlogPosts, loadDocsConfig, …
 *            '@devsforfun/freewrite-framework/mdx'      — <Mdx />
 *            '@devsforfun/freewrite-framework/components'
 *   client:  '@devsforfun/freewrite-framework/search-dialog'    — <SearchDialog />
 *            '@devsforfun/freewrite-framework/subscribe-form'   — <SubscribeForm />
 *   either:  '@devsforfun/freewrite-framework/analytics-script' — <AnalyticsScript />
 *   styles:  '@devsforfun/freewrite-framework/styles.css'
 */
export * from './nav';
export { buildSearchIndex } from './search';
export type { SearchDoc } from './search';
export { resolveSlugRedirect } from './slug-history';

export const FRAMEWORK_VERSION = '0.1.0';
