/**
 * Integration options and how they resolve against the host's Astro config.
 * Pure (paths in, plain data out) so it's unit-tested without Astro, and the
 * resolved shape is what the routes read at build time through the
 * `virtual:@inkform/astro/config` module.
 */

import path from 'node:path';

export interface InkformOptions {
  /**
   * Where the docs are mounted in this Astro site. Every route the
   * integration adds lives under it; nothing is added at `/` unless you set
   * `base: '/'`. Default `'/docs'`.
   */
  base?: string;
  /**
   * The path prefix readers see in links, when something in front of the
   * site serves the docs from a different place than `base`. Example: a
   * `docs.example.com` host mapped onto `/docs` uses `publicBase: ''`, so
   * links read `/quickstart` instead of `/docs/quickstart`. Defaults to
   * `base` (after Astro's own `base`, if you set one).
   */
  publicBase?: string;
  /**
   * The content folder: `docs/docs.json` and the MDX pages, plus optional
   * `blog/` and `changelog/` folders. Relative to the project root.
   * Default `'./content'`.
   */
  contentRoot?: string;
  /**
   * `'galley'` (default) for Inkform's warm paper-and-ink tokens, `'plain'`
   * for the framework's neutral defaults, or a path (relative to the project
   * root) to your own CSS file of `--fw-*` token overrides.
   */
  theme?: 'galley' | 'plain' | (string & {});
  /** More CSS files to load on docs pages after the theme, relative to the project root. */
  customCss?: string[];
  /** Build a Pagefind search index after `astro build`. Default `true`. */
  search?: boolean;
  /**
   * Draw ```mermaid fences as diagrams in the browser. Needs the `mermaid`
   * package installed in your site. Default `false`: fences show their source.
   */
  mermaid?: boolean;
  /** Serve `<base>/llms.txt` and `<base>/llms-full.txt`. Default `true`. */
  llmsTxt?: boolean;
}

/** Facts about the host's Astro config that the options resolve against. */
export interface HostConfig {
  /** Absolute path of the Astro project root. */
  root: string;
  /** Astro's own `base` option. */
  siteBase: string;
  trailingSlash: 'always' | 'never' | 'ignore';
  /** Whether `security.csp` is on, so pages register hashes for their inline script and style. */
  csp: boolean;
  /** `security.csp.algorithm`. Default `'SHA-256'`. */
  cspAlgorithm?: CspAlgorithm;
}

export type CspAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

/** Built-in themes ship with the package; anything else is a path. */
export const BUILT_IN_THEMES = ['galley', 'plain'] as const;

export interface ResolvedOptions {
  /** Route mount point, normalized: `''` for the site root, else `/docs` style (no trailing slash). */
  base: string;
  /** Astro's own `base`, normalized the same way. Root-relative asset paths (logo, images) are served under it. */
  siteBase: string;
  /** Link prefix readers see, normalized the same way. */
  publicBase: string;
  /** Absolute path of the content folder. */
  contentRoot: string;
  /** `'galley'`, `'plain'`, or an absolute path to a CSS file. */
  theme: string;
  /** Absolute paths. */
  customCss: string[];
  search: boolean;
  mermaid: boolean;
  llmsTxt: boolean;
  trailingSlash: HostConfig['trailingSlash'];
  csp: boolean;
  cspAlgorithm: CspAlgorithm;
}

export class InkformOptionsError extends Error {
  override name = 'InkformOptionsError';
}

/**
 * `'/docs/'`, `'docs'` and `'/docs'` → `'/docs'`; `'/'` and `''` → `''`.
 * Rejects anything that isn't a plain path (no protocol, query or hash).
 */
export function normalizeBase(value: string, label = 'base'): string {
  const trimmed = value.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || /[?#\s]/.test(trimmed)) {
    throw new InkformOptionsError(`\`${label}\` must be a path like "/docs", got "${value}".`);
  }
  const parts = trimmed.split('/').filter(Boolean);
  if (parts.some((p) => p === '.' || p === '..')) {
    throw new InkformOptionsError(`\`${label}\` can't contain "." or ".." segments, got "${value}".`);
  }
  return parts.length ? `/${parts.join('/')}` : '';
}

export function resolveOptions(options: InkformOptions, host: HostConfig): ResolvedOptions {
  const base = normalizeBase(options.base ?? '/docs');
  const siteBase = normalizeBase(host.siteBase, 'Astro base');
  const publicBase =
    options.publicBase === undefined ? `${siteBase}${base}` : normalizeBase(options.publicBase, 'publicBase');

  const theme = options.theme ?? 'galley';
  const isBuiltIn = (BUILT_IN_THEMES as readonly string[]).includes(theme);

  return {
    base,
    siteBase,
    publicBase,
    contentRoot: path.resolve(host.root, options.contentRoot ?? './content'),
    theme: isBuiltIn ? theme : path.resolve(host.root, theme),
    customCss: (options.customCss ?? []).map((file) => path.resolve(host.root, file)),
    search: options.search ?? true,
    mermaid: options.mermaid ?? false,
    llmsTxt: options.llmsTxt ?? true,
    trailingSlash: host.trailingSlash,
    csp: host.csp,
    cspAlgorithm: host.cspAlgorithm ?? 'SHA-256',
  };
}

/** The catch-all route pattern every docs page is served from. */
export function docsRoutePattern(base: string): string {
  return `${base}/[...slug]`;
}
