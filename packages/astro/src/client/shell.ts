/**
 * The shell's behaviour, without React: the mobile drawer, the light/dark
 * toggle, the on-this-page highlight, and the scroll hints on the header's
 * tab row. Each piece mirrors its framework component (shell-client.tsx,
 * theme-toggle.tsx, scrollable-top-nav.tsx) and keeps its classes and
 * storage keys, so the CSS and a returning reader's saved theme carry over.
 */

const THEME_KEY = 'fw-theme';

function initDrawer(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-fw-drawer-toggle]');
  const drawer = document.querySelector<HTMLElement>('[data-fw-drawer]');
  if (!toggle || !drawer) return;

  let backdrop: HTMLDivElement | null = null;
  const isOpen = () => drawer.classList.contains('fw-sidebar-drawer--open');

  const setOpen = (open: boolean) => {
    drawer.classList.toggle('fw-sidebar-drawer--open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    drawer.inert = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open && !backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'fw-sidebar-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.addEventListener('click', () => setOpen(false));
      drawer.before(backdrop);
    } else if (!open && backdrop) {
      backdrop.remove();
      backdrop = null;
    }
  };

  toggle.addEventListener('click', () => {
    const open = !isOpen();
    setOpen(open);
    if (open) drawer.querySelector<HTMLElement>('a[aria-current="page"], a, button')?.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });
  // Past the drawer breakpoint the desktop sidebar takes over; don't leave an open drawer behind.
  window.matchMedia('(min-width: 60.0625rem)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}

function initThemeToggle(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-fw-theme-toggle]');
  if (buttons.length === 0) return;
  const root = document.documentElement;

  const render = () => {
    const dark = root.classList.contains('dark');
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      button.title = dark ? 'Light mode' : 'Dark mode';
      const icon = button.querySelector('.fw-theme-toggle-icon');
      if (icon) icon.textContent = dark ? '☀' : '☾';
    }
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      try {
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
      } catch {
        // Storage unavailable: the choice still applies to this page.
      }
      render();
    });
  }
  render();
}

/** Marks the TOC link of the topmost heading in view, as the framework's TocList does. */
function initTocSpy(): void {
  const toc = document.querySelector<HTMLElement>('[data-fw-toc-spy]');
  if (!toc || typeof IntersectionObserver === 'undefined') return;

  const links = new Map<string, HTMLAnchorElement>();
  for (const a of toc.querySelectorAll<HTMLAnchorElement>('a.fw-toc-link')) {
    const id = decodeURIComponent(a.hash.slice(1));
    if (id) links.set(id, a);
  }
  const headings = [...links.keys()]
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);
  if (headings.length === 0) return;

  const visible = new Set<string>();
  const setActive = (id: string) => {
    for (const [slug, a] of links) {
      if (slug === id) a.dataset.active = 'true';
      else delete a.dataset.active;
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      }
      const first = headings.find((el) => visible.has(el.id));
      if (first) setActive(first.id);
    },
    { rootMargin: '-64px 0px -40% 0px', threshold: 0 },
  );
  for (const el of headings) observer.observe(el);
}

function initTopNavScroll(): void {
  for (const wrap of document.querySelectorAll<HTMLElement>('[data-fw-topnav-scroll]')) {
    const track = wrap.querySelector<HTMLElement>('.fw-topnav-scroll-track');
    if (!track) continue;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = track;
      wrap.classList.toggle('fw-topnav-scroll--can-left', scrollLeft > 1);
      wrap.classList.toggle('fw-topnav-scroll--can-right', scrollLeft + clientWidth < scrollWidth - 1);
    };
    track.addEventListener('scroll', update, { passive: true });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(update).observe(track);
    update();
  }
}

let started = false;

export function initShell(): void {
  if (started) return;
  started = true;
  initDrawer();
  initThemeToggle();
  initTocSpy();
  initTopNavScroll();
}
