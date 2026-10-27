/**
 * What the changelog page needs beyond the framework's loader: an anchor per
 * entry that stays unique and stable, and the version label. Pure, so it's
 * unit-tested.
 */

/**
 * One anchor per entry, from its slug (the file name without the date
 * prefix). `entries` are newest first, as the loader returns them. When two
 * entries share a slug (`2026-01-05-update.mdx`, `2026-02-09-update.mdx`),
 * the oldest keeps the plain slug and later ones get `-2`, `-3`, so a link to
 * an entry doesn't move to another one when a newer entry is added.
 */
export function changelogAnchors(slugs: readonly string[]): string[] {
  const used = new Set<string>();
  const out = new Array<string>(slugs.length);
  for (let i = slugs.length - 1; i >= 0; i--) {
    const slug = slugs[i] || 'entry';
    let anchor = slug;
    for (let n = 2; used.has(anchor); n++) anchor = `${slug}-${n}`;
    used.add(anchor);
    out[i] = anchor;
  }
  return out;
}

/** `1.2.0` and `v1.2.0` → `v1.2.0`; anything that isn't a version number is shown as written. */
export function versionLabel(version: string | null): string | null {
  const v = version?.trim();
  if (!v) return null;
  return /^v?\d/i.test(v) ? `v${v.replace(/^v/i, '')}` : v;
}
