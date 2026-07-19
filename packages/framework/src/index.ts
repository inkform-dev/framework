/**
 * @inkform/framework — root entry.
 *
 * A standalone toolkit for building documentation, blog, and changelog sites
 * with Next.js + MDX. Only PURE / shared exports live here (no node:fs, no
 * 'use client'), so this is safe to import from anywhere. Import the rest from
 * their subpaths to keep client bundles clean:
 *
 *   server:  '@inkform/framework/content'        — loadDocsConfig, loadOpenApiSpec, …
 *            '@inkform/framework/mdx'             — <Mdx />
 *            '@inkform/framework/components'      — Callout, Card, Tabs, Steps, …
 *   layout:  '@inkform/framework/docs-shell'      — <DocsShell />, <Sidebar />, <TocList />
 *            '@inkform/framework/scalar-theme'     — buildScalarCustomCss() for the Scalar-rendered API Reference route
 *   client:  '@inkform/framework/search-dialog'    — <SearchDialog /> (Pagefind-backed, see search-dialog.tsx)
 *            '@inkform/framework/ask-ai'           — <AskAi /> (feature-flagged)
 *            '@inkform/framework/theme-toggle'     — <ThemeToggle />
 *   styles:  '@inkform/framework/styles.css'
 */
export * from './nav';
export * from './openapi';
export { resolveSlugRedirect } from './slug-history';

export const FRAMEWORK_VERSION = '0.2.0';
