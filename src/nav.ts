/**
 * freewrite.json navigation model — the same shape the Freewrite CMS editor
 * writes (Mintlify-style groups → pages, decoupled from on-disk file layout).
 * Pure, no IO; the framework reads + renders these.
 */

export type DocsNavPage = {
  title: string;
  slug: string;
  file: string;
  children?: DocsNavPage[];
};

export type DocsNavGroup = {
  group: string;
  pages: DocsNavPage[];
};

export type DocsConfig = {
  name: string;
  version: string;
  navigation: DocsNavGroup[];
  versioning?: { enabled: boolean; versions: string[] };
};

export type FlatDocPage = { title: string; slug: string; file: string; depth: number };

export function listDocPages(config: DocsConfig): FlatDocPage[] {
  const out: FlatDocPage[] = [];
  for (const group of config.navigation ?? []) {
    const walk = (pages: DocsNavPage[], depth: number) => {
      for (const p of pages) {
        out.push({ title: p.title, slug: p.slug, file: p.file, depth });
        if (p.children?.length) walk(p.children, depth + 1);
      }
    };
    walk(group.pages ?? [], 1);
  }
  return out;
}

export function findDocPage(config: DocsConfig, slug: string): FlatDocPage | null {
  return listDocPages(config).find((p) => p.slug === slug) ?? null;
}

/** Prev/next pagination for a doc page, in flattened nav order. */
export function docNeighbours(
  config: DocsConfig,
  slug: string,
): { prev: FlatDocPage | null; next: FlatDocPage | null } {
  const pages = listDocPages(config);
  const i = pages.findIndex((p) => p.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return { prev: pages[i - 1] ?? null, next: pages[i + 1] ?? null };
}
