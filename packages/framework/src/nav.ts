/**
 * `docs.json` navigation model — Mintlify-style groups → pages, decoupled from
 * the on-disk file layout. Pure, no IO; the framework reads + renders these.
 *
 * The model supports top-level **tabs** (e.g. "Guides" / "API Reference"),
 * **anchors** and **navbar links** (external/top-bar links), nested page
 * children, and an OpenAPI-backed tab. A config with only `navigation` (no
 * `tabs`) is treated as a single implicit tab, so older configs keep working.
 */

export type DocsNavPage = {
  title: string;
  slug: string;
  /** MDX file relative to content/<docsDir>, e.g. `getting-started.mdx`. */
  file: string;
  /** Optional Lucide-style icon name a theme may render. */
  icon?: string;
  /** If set, this entry is an external/explicit link, not an MDX page. */
  href?: string;
  children?: DocsNavPage[];
};

export type DocsNavGroup = {
  group: string;
  icon?: string;
  pages: DocsNavPage[];
};

export type DocsTab = {
  /** Tab label shown in the top bar, e.g. "Guides" or "API Reference". */
  tab: string;
  icon?: string;
  /** Nav groups shown when this tab is active. */
  navigation?: DocsNavGroup[];
  /** Path to an OpenAPI spec (relative to content/<docsDir>); renders an API tab. */
  openapi?: string;
  /**
   * Passed straight through to Scalar's `mcp` config on the API Reference tab.
   * Scalar's own "Generate MCP" button (rendered in its UI) reads this: unset
   * uses Scalar's default hosted MCP-generation flow; `url`/`name` point it at
   * a self-hosted MCP server for this spec instead; `disabled: true` hides the
   * button. This is the seam for the docs-as-MCP-server differentiator once
   * inkform generates its own MCP servers from a spec — set `url` to that
   * server's endpoint then.
   */
  mcp?: { name?: string; url?: string; disabled?: boolean };
  /**
   * Which renderer draws the API Reference tab. Defaults to `'scalar'`
   * (today's `@scalar/nextjs-api-reference` embed — unchanged production
   * behavior) so this stays an opt-in flag while the native renderer is
   * built out, not a switch that changes default behavior the moment it
   * exists. `'native'` renders per-operation via the framework's own
   * React/Galley components (no Scalar/Vue dependency) instead.
   */
  apiReference?: { renderer?: 'scalar' | 'native' };
};

export type DocsLink = { name: string; href: string; icon?: string };

export type DocsConfig = {
  name: string;
  version?: string;
  /** Logo image path, or per-scheme paths. */
  logo?: string | { light?: string; dark?: string };
  favicon?: string;
  /** Brand colors a theme MAY read to tint accents (hex). */
  colors?: { primary?: string; light?: string; dark?: string };
  /** Top-bar links rendered with icons (Mintlify "anchors"). */
  anchors?: DocsLink[];
  /** Top-bar text links (Mintlify "navbar.links"). */
  navbarLinks?: DocsLink[];
  /** Optional primary CTA button in the top bar. */
  cta?: { label: string; href: string };
  /** Top navigation tabs. When omitted, `navigation` is the single implicit tab. */
  tabs?: DocsTab[];
  /**
   * Single-tab nav. Used when `tabs` is absent. Tab-based configs may omit it
   * (each tab carries its own `navigation`); the loaders treat a missing value
   * as an empty array, and `docTabs()`/`tabNavigation()` handle that case.
   */
  navigation: DocsNavGroup[];
  /** OpenAPI spec for the single-tab case. */
  openapi?: string;
  footer?: { socials?: Record<string, string>; links?: { group: string; items: DocsLink[] }[] };
  versioning?: { enabled: boolean; versions: string[] };
};

export type FlatDocPage = {
  title: string;
  slug: string;
  file: string;
  depth: number;
  group: string;
  tab: string;
};

/** Normalize a config into tabs — a `navigation`-only config becomes one tab. */
export function docTabs(config: DocsConfig): DocsTab[] {
  if (config.tabs?.length) return config.tabs;
  return [{ tab: 'Documentation', navigation: config.navigation ?? [], openapi: config.openapi }];
}

/** Nav groups for a tab (the first/active tab by default). */
export function tabNavigation(config: DocsConfig, tabName?: string): DocsNavGroup[] {
  const tabs = docTabs(config);
  const t = tabName ? tabs.find((x) => x.tab === tabName) : tabs[0];
  return t?.navigation ?? [];
}

/** Flatten MDX pages across all tabs (or one tab) in nav order. Skips `href` links. */
export function listDocPages(config: DocsConfig, tabName?: string): FlatDocPage[] {
  const tabs = tabName ? docTabs(config).filter((t) => t.tab === tabName) : docTabs(config);
  const out: FlatDocPage[] = [];
  for (const t of tabs) {
    for (const group of t.navigation ?? []) {
      const walk = (pages: DocsNavPage[], depth: number) => {
        for (const p of pages) {
          if (!p.href) {
            out.push({ title: p.title, slug: p.slug, file: p.file, depth, group: group.group, tab: t.tab });
          }
          if (p.children?.length) walk(p.children, depth + 1);
        }
      };
      walk(group.pages ?? [], 1);
    }
  }
  return out;
}

export function findDocPage(config: DocsConfig, slug: string): FlatDocPage | null {
  return listDocPages(config).find((p) => p.slug === slug) ?? null;
}

/** Prev/next pagination within the page's own tab, in flattened nav order. */
export function docNeighbours(
  config: DocsConfig,
  slug: string,
): { prev: FlatDocPage | null; next: FlatDocPage | null } {
  const page = findDocPage(config, slug);
  const pages = listDocPages(config, page?.tab);
  const i = pages.findIndex((p) => p.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return { prev: pages[i - 1] ?? null, next: pages[i + 1] ?? null };
}
