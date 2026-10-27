import { describe, expect, it } from 'vitest';
import { changelogAnchors, versionLabel } from './changelog';
import { headingsFromHtml, scopeIds } from './headings';
import { PageRenderer } from './render';

describe('changelogAnchors', () => {
  it('uses each entry’s slug', () => {
    expect(changelogAnchors(['v0-2-0', 'v0-1-0'])).toEqual(['v0-2-0', 'v0-1-0']);
  });

  it('keeps the oldest entry’s anchor when slugs repeat, so newer entries never take it', () => {
    // Newest first, as the loader returns them.
    expect(changelogAnchors(['update', 'release', 'update', 'update'])).toEqual(['update-3', 'release', 'update-2', 'update']);
    expect(changelogAnchors(['update', 'update-2', 'update'])).toEqual(['update-3', 'update-2', 'update']);
    expect(changelogAnchors([''])).toEqual(['entry']);
  });
});

describe('versionLabel', () => {
  it('prints one v in front of a version number', () => {
    expect(versionLabel('1.2.0')).toBe('v1.2.0');
    expect(versionLabel('v1.2.0')).toBe('v1.2.0');
    expect(versionLabel('V2')).toBe('v2');
  });

  it('shows anything else as written, and nothing for no version', () => {
    expect(versionLabel('Spring 2026')).toBe('Spring 2026');
    expect(versionLabel(null)).toBeNull();
    expect(versionLabel('  ')).toBeNull();
  });
});

describe('scopeIds', () => {
  const renderer = () => new PageRenderer({ mermaid: false, operation: null });
  const entry = '### Added\n\n- A thing[^1]\n\n### Fixed\n\n- See [Added](#added)\n\n[^1]: A note.\n';

  it('gives two entries’ headings and footnotes their own ids, and keeps links to them working', async () => {
    const r = renderer();
    const a = scopeIds(await r.mdx(entry), 'v0-2-0');
    const b = scopeIds(await r.mdx(entry), 'v0-1-0');
    // GFM's footnote section has its own (visually hidden) heading.
    expect(headingsFromHtml(a).map((h) => h.slug)).toEqual(['v0-2-0-added', 'v0-2-0-fixed', 'v0-2-0-footnote-label']);
    expect(headingsFromHtml(b).map((h) => h.slug)).toEqual(['v0-1-0-added', 'v0-1-0-fixed', 'v0-1-0-footnote-label']);
    expect(a).toMatch(/aria-describedby="v0-2-0-footnote-label"/);
    expect(a).toContain('href="#v0-2-0-added"');

    const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const shared = ids(a).filter((id) => ids(b).includes(id));
    expect(shared).toEqual([]);
    // Every in-page link in an entry lands on an id in that entry.
    for (const [, target] of a.matchAll(/href="#([^"]+)"/g)) expect(ids(a)).toContain(target);
  });

  it('returns HTML without headings or footnotes unchanged', () => {
    expect(scopeIds('<p>Plain <a href="#elsewhere">link</a></p>', 'x')).toBe('<p>Plain <a href="#elsewhere">link</a></p>');
  });
});
