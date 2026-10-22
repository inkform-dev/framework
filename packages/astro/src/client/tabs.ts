/**
 * Tab behaviour over server-rendered tab markup: every panel is already in
 * the HTML (so search, view-source and readers without JavaScript get all of
 * them); this only switches which one shows. Used for `<Tabs>`, `<CodeGroup>`
 * and the API reference's response samples.
 */

export interface TabParts {
  tabs: HTMLElement[];
  panels: HTMLElement[];
  /** Class added to the selected tab, e.g. `fw-tabs-trigger--active`. */
  activeClass: string;
}

export function selectTab({ tabs, panels, activeClass }: TabParts, index: number): void {
  tabs.forEach((tab, i) => {
    const on = i === index;
    tab.setAttribute('aria-selected', String(on));
    if (tab.getAttribute('role') === 'tab') tab.tabIndex = on ? 0 : -1;
    tab.classList.toggle(activeClass, on);
  });
  panels.forEach((panel, i) => {
    panel.hidden = i !== index;
  });
}

/** Click and keyboard (← → Home End) switching. */
export function wireTabs(parts: TabParts): void {
  const { tabs } = parts;
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(parts, i));
    tab.addEventListener('keydown', (e) => {
      const last = tabs.length - 1;
      const next =
        e.key === 'ArrowRight' ? (i + 1) % tabs.length
        : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
        : e.key === 'Home' ? 0
        : e.key === 'End' ? last
        : -1;
      if (next === -1) return;
      e.preventDefault();
      selectTab(parts, next);
      tabs[next]?.focus();
    });
  });
}

/** Direct children only, so nested tab sets stay independent. */
export function childrenWithClass(parent: Element, className: string): HTMLElement[] {
  return [...parent.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el.classList.contains(className));
}
