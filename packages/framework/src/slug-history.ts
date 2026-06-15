/**
 * Slug-history redirects. When a docs page's slug changes, the editor records
 * old → new in slug-history.json. The template's proxy.ts imports that JSON and
 * calls this helper to 301 old URLs to their current location.
 *
 * Pure + edge-safe (no fs) — the proxy imports the JSON statically so it's
 * bundled into the edge runtime.
 */
export function resolveSlugRedirect(
  pathname: string,
  history: Record<string, string>,
  docsBasePath = '/docs',
): string | null {
  const prefix = docsBasePath.replace(/\/+$/, '') + '/';
  if (!pathname.startsWith(prefix)) return null;
  const slug = pathname.slice(prefix.length).replace(/\/+$/, '');
  const target = history[slug];
  if (!target || target === slug) return null;
  return prefix + target;
}
