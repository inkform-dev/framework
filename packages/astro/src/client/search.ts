/**
 * The search dialog, without React: the framework SearchDialog's behaviour
 * (⌘K / Ctrl+K, arrow keys, Enter, `?q=` deep links, `?highlight=` on the
 * page a result opens) over the markup in SearchDialog.astro.
 *
 * Pagefind's runtime is loaded with a plain dynamic import from
 * `<base>/_pagefind/`, a same-origin module, so it works under a CSP with
 * `script-src 'self'`. Pagefind compiles WebAssembly, which a CSP must allow
 * with `'wasm-unsafe-eval'`; docs pages add that to their own policy when
 * Astro's `security.csp` is on. Before a production build there's no index,
 * and the dialog says so.
 */

type PagefindResultData = {
  url: string;
  meta: { title?: string };
  excerpt: string;
  filters?: Record<string, string[]>;
};

type PagefindModule = {
  options?: (options: { baseUrl?: string }) => Promise<void> | void;
  init?: () => Promise<void> | void;
  search: (query: string) => Promise<{ results: { id: string; data: () => Promise<PagefindResultData> }[] }>;
};

type PagefindHighlightCtor = new (options: {
  highlightParam: string;
  addStyles: boolean;
  markOptions: { className: string; done?: () => void };
}) => unknown;

interface Result {
  url: string;
  title: string;
  excerpt: string;
  method?: string;
}

const QUERY_PARAM = 'q';
const HIGHLIGHT_PARAM = 'highlight';
const MIN_LENGTH = 2;
const MAX_RESULTS = 12;

const words = (q: string) => q.trim().split(/\s+/).filter(Boolean);

let pagefind: Promise<PagefindModule | null> | null = null;

function loadPagefind(base: string): Promise<PagefindModule | null> {
  pagefind ??= import(/* @vite-ignore */ `${base}/pagefind.js`)
    .then(async (mod: PagefindModule) => {
      // The index stores full URLs (see search-index.ts). Pagefind would put
      // the bundle's folder in front of them (`/docs/docs/…`) unless told
      // they already start at the site root.
      await mod.options?.({ baseUrl: '/' });
      await mod.init?.();
      return mod;
    })
    .catch(() => null);
  return pagefind;
}

/** The query as repeated `?q=` params, without a history entry per keystroke. */
function syncQueryParam(value: string): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(QUERY_PARAM);
  for (const w of words(value)) url.searchParams.append(QUERY_PARAM, w);
  window.history.replaceState(window.history.state, '', url);
}

/** Where a result goes: its URL carrying the query as `?highlight=` for the destination page. */
function destination(url: string, query: string): string {
  const dest = new URL(url, window.location.origin);
  dest.searchParams.delete(HIGHLIGHT_PARAM);
  for (const w of words(query)) dest.searchParams.append(HIGHLIGHT_PARAM, w);
  return dest.pathname + dest.search + dest.hash;
}

/** On a page opened from a result, mark the searched words in the article and scroll to the first. */
async function highlightFromUrl(base: string): Promise<void> {
  if (!new URLSearchParams(window.location.search).has(HIGHLIGHT_PARAM)) return;
  try {
    await import(/* @vite-ignore */ `${base}/pagefind-highlight.js`);
  } catch {
    return;
  }
  const Highlight = (window as unknown as { PagefindHighlight?: PagefindHighlightCtor }).PagefindHighlight;
  if (!Highlight) return;
  new Highlight({
    highlightParam: HIGHLIGHT_PARAM,
    addStyles: false,
    markOptions: {
      className: 'fw-search-highlight',
      done: () => document.querySelector('.fw-search-highlight')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    },
  });
}

function emptyRow(text: string): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'fw-search-empty';
  li.textContent = text;
  return li;
}

export function initSearch(): void {
  const dialog = document.querySelector<HTMLElement>('[data-fw-search]');
  const input = dialog?.querySelector<HTMLInputElement>('[data-fw-search-input]');
  const list = dialog?.querySelector<HTMLUListElement>('[data-fw-search-results]');
  if (!dialog || !input || !list || dialog.dataset.fwReady) return;
  dialog.dataset.fwReady = '';
  const base = dialog.dataset.pagefindBase ?? '/_pagefind';

  if (!/Mac|iPhone|iPad/.test(navigator.userAgent)) {
    for (const kbd of document.querySelectorAll('[data-fw-search-shortcut]')) kbd.textContent = 'Ctrl K';
  }

  let results: Result[] = [];
  let active = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let run = 0;
  let returnFocus: HTMLElement | null = null;

  const isOpen = () => !dialog.hidden;

  const paintActive = () => {
    list.querySelectorAll('a').forEach((a, i) => {
      a.dataset.active = String(i === active);
      if (i === active) a.scrollIntoView({ block: 'nearest' });
    });
  };

  const render = (state: 'idle' | 'short' | 'unavailable' | 'results') => {
    list.replaceChildren();
    if (state === 'idle') return void list.append(emptyRow('Type to search…'));
    if (state === 'short') return void list.append(emptyRow('Keep typing to search…'));
    if (state === 'unavailable') {
      return void list.append(emptyRow('Search index unavailable — run a production build to enable search.'));
    }
    if (results.length === 0) return void list.append(emptyRow(`No results for “${input.value.trim()}”`));
    results.forEach((r, i) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = destination(r.url, input.value);
      a.dataset.active = String(i === active);
      a.addEventListener('mouseenter', () => {
        active = i;
        paintActive();
      });
      const title = document.createElement('span');
      title.className = 'fw-search-result-title';
      if (r.method) {
        const pill = document.createElement('span');
        pill.className = `fw-method-pill fw-method-${r.method.toLowerCase()}`;
        pill.textContent = r.method;
        title.append(pill);
      }
      title.append(r.title);
      const excerpt = document.createElement('span');
      excerpt.className = 'fw-search-result-excerpt';
      // Pagefind's excerpt is built from this site's own indexed text, with
      // the matches wrapped in <mark>.
      excerpt.innerHTML = r.excerpt;
      a.append(title, excerpt);
      li.append(a);
      list.append(li);
    });
  };

  const search = () => {
    const q = input.value;
    syncQueryParam(q);
    clearTimeout(timer);
    const current = ++run;
    if (words(q).length === 0) return render('idle');
    if (q.trim().length < MIN_LENGTH) return render('short');
    timer = setTimeout(async () => {
      const mod = await loadPagefind(base);
      if (current !== run) return;
      if (!mod) return render('unavailable');
      const { results: hits } = await mod.search(q);
      const data = await Promise.all(hits.slice(0, MAX_RESULTS).map((h) => h.data()));
      if (current !== run) return;
      results = data.map((d) => ({ url: d.url, title: d.meta.title ?? d.url, excerpt: d.excerpt, method: d.filters?.method?.[0] }));
      active = 0;
      render('results');
    }, 120);
  };

  const open = () => {
    if (isOpen()) return;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.hidden = false;
    for (const b of document.querySelectorAll('[data-fw-search-open]')) b.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => input.focus());
    search();
  };

  const close = () => {
    if (!isOpen()) return;
    dialog.hidden = true;
    clearTimeout(timer);
    run++;
    for (const b of document.querySelectorAll('[data-fw-search-open]')) b.setAttribute('aria-expanded', 'false');
    // Drop `?q=` so a reload doesn't reopen a search the reader closed.
    syncQueryParam('');
    returnFocus?.focus();
  };

  for (const button of document.querySelectorAll('[data-fw-search-open]')) button.addEventListener('click', open);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (isOpen()) close();
      else open();
    } else if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      close();
    }
  });
  input.addEventListener('input', search);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = Math.min(active + 1, results.length - 1);
      paintActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = Math.max(active - 1, 0);
      paintActive();
    } else if (e.key === 'Enter') {
      const target = list.querySelectorAll('a')[active];
      if (target) {
        e.preventDefault();
        window.location.href = target.href;
      }
    }
  });

  // A `?q=` already in the URL reopens the dialog with that search.
  const initial = new URLSearchParams(window.location.search).getAll(QUERY_PARAM).join(' ');
  if (initial) {
    input.value = initial;
    open();
  }

  void highlightFromUrl(base);
}
