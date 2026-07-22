/**
 * Syntax highlighting for the API reference's dynamically-generated code
 * (request samples, response bodies) — these are plain strings built at
 * render time from the OpenAPI spec, not static MDX, so the MDX pipeline's
 * rehype-pretty-code (mdx.tsx) doesn't apply. Uses shiki directly instead,
 * with the same dual-theme mechanism rehype-pretty-code uses under the hood
 * (themes: { light, dark }, defaultColor: false -> --shiki-light/-dark CSS
 * vars per token; see prose.css's `[data-rehype-pretty-code-figure] code
 * span` rule for the sibling CSS this mirrors) so both stay visually
 * consistent and both correctly re-tint on theme toggle without JS.
 *
 * One highlighter instance, created lazily and cached — shiki's startup
 * (loading themes/grammars) is real cost, not something to pay per code
 * block.
 */

import { getSingletonHighlighter } from 'shiki';

const THEMES = { light: 'github-light', dark: 'github-dark' } as const;
const LANGS = ['bash', 'javascript', 'python', 'json', 'http'] as const;

/** Highlights `code` as `lang`, returning shiki's HTML (a `<pre class="shiki">...</pre>` tree with per-token --shiki-light/-dark vars). Falls back to escaped plain text if the language isn't loaded or highlighting fails. */
export async function highlightCode(code: string, lang: string): Promise<string> {
  try {
    const highlighter = await getSingletonHighlighter({ themes: [THEMES.light, THEMES.dark], langs: [...LANGS] });
    const loaded = highlighter.getLoadedLanguages();
    const safeLang = loaded.includes(lang) ? lang : 'text';
    return highlighter.codeToHtml(code, { lang: safeLang, themes: THEMES, defaultColor: false });
  } catch {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre class="shiki"><code>${escaped}</code></pre>`;
  }
}
