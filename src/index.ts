/**
 * @freewrite-cms/framework — root entry.
 *
 * Only PURE / shared exports live here (no node:fs, no 'use client'), so this
 * is safe to import from anywhere. Import the rest from their subpaths to keep
 * client bundles clean:
 *
 *   server:  '@freewrite-cms/framework/content'  — loadBlogPosts, loadDocsConfig, …
 *            '@freewrite-cms/framework/mdx'      — <Mdx />
 *            '@freewrite-cms/framework/components'
 *   client:  '@freewrite-cms/framework/search-dialog'    — <SearchDialog />
 *            '@freewrite-cms/framework/subscribe-form'   — <SubscribeForm />
 *   either:  '@freewrite-cms/framework/analytics-script' — <AnalyticsScript />
 *   styles:  '@freewrite-cms/framework/styles.css'
 */
export * from './nav';
export { buildSearchIndex } from './search';
export type { SearchDoc } from './search';
export { resolveSlugRedirect } from './slug-history';

export const FRAMEWORK_VERSION = '0.1.0';
