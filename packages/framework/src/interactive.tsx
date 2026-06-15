'use client';

import * as React from 'react';

/* ---------------------------------------------------------------------------
 * Tabs / Tab
 * -------------------------------------------------------------------------*/

export interface TabProps {
  title: string;
  children?: React.ReactNode;
}

/** Individual tab panel — consumed by <Tabs>. */
export function Tab({ children }: TabProps) {
  return <>{children}</>;
}
Tab.displayName = 'Tab';

export interface TabsProps {
  children?: React.ReactNode;
  defaultIndex?: number;
}

/**
 * Stateful tab panels. Reads the `title` prop from each <Tab> child to build
 * the tab bar. Keyboard-accessible (arrow keys, Enter/Space).
 */
export function Tabs({ children, defaultIndex = 0 }: TabsProps) {
  const tabs = React.Children.toArray(children).filter(
    (c): c is React.ReactElement<TabProps> =>
      React.isValidElement(c) &&
      typeof (c.props as TabProps).title === 'string',
  );

  const [active, setActive] = React.useState(() =>
    Math.min(defaultIndex, Math.max(0, tabs.length - 1)),
  );

  const tabListRef = React.useRef<HTMLDivElement>(null);
  const uid = React.useId();

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    const count = tabs.length;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (idx + 1) % count;
      setActive(next);
      (tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next])?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (idx - 1 + count) % count;
      setActive(prev);
      (tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[prev])?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
      (tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[0])?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(count - 1);
      (tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[count - 1])?.focus();
    }
  }

  if (tabs.length === 0) return null;

  return (
    <div className="fw-tabs">
      <div className="fw-tabs-bar" role="tablist" ref={tabListRef}>
        {tabs.map((tab, i) => (
          <button
            key={i}
            role="tab"
            id={`${uid}-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`${uid}-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            className={`fw-tabs-trigger${active === i ? ' fw-tabs-trigger--active' : ''}`}
            onClick={() => setActive(i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {tab.props.title}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={i}
          role="tabpanel"
          id={`${uid}-panel-${i}`}
          aria-labelledby={`${uid}-tab-${i}`}
          hidden={active !== i}
          className="fw-tabs-panel"
        >
          {tab.props.children}
        </div>
      ))}
    </div>
  );
}
Tabs.displayName = 'Tabs';

/* ---------------------------------------------------------------------------
 * CodeGroup
 * -------------------------------------------------------------------------*/

export interface CodeGroupProps {
  children?: React.ReactNode;
}

/**
 * Tabbed view over multiple fenced code blocks. Each child should be a code
 * block rendered by rehype-pretty-code. We read the `data-filename` /
 * `data-title` attribute from the figure element, or fall back to the code
 * language label if present, otherwise "Code N".
 */
export function CodeGroup({ children }: CodeGroupProps) {
  const items = React.Children.toArray(children);
  const [active, setActive] = React.useState(0);
  const uid = React.useId();

  /** Extract a display title from a child element. */
  function titleOf(child: React.ReactNode, idx: number): string {
    if (!React.isValidElement(child)) return `Code ${idx + 1}`;
    const props = child.props as Record<string, unknown>;
    // A pre-wrapped figure from rehype-pretty-code carries data-* via props
    const filenameAttr =
      (props['data-filename'] as string | undefined) ??
      (props['data-title'] as string | undefined) ??
      (props.filename as string | undefined) ??
      (props.title as string | undefined);
    if (filenameAttr) return filenameAttr;
    // If it's a <figure data-rehype-pretty-code-figure> look at children for a title bar
    const figChildren = React.Children.toArray(props.children as React.ReactNode);
    const figcaption = figChildren.find(
      (c) =>
        React.isValidElement(c) &&
        (c.type === 'figcaption' || (c.props as Record<string, unknown>)['data-rehype-pretty-code-title'] !== undefined),
    );
    if (figcaption && React.isValidElement(figcaption)) {
      const cap = figcaption.props as Record<string, unknown>;
      if (typeof cap.children === 'string') return cap.children;
    }
    // Try to pull the language from a <code data-language="..."> inside
    const pre = figChildren.find((c) => React.isValidElement(c) && c.type === 'pre');
    if (pre && React.isValidElement(pre)) {
      const codeArr = React.Children.toArray((pre.props as Record<string, unknown>).children as React.ReactNode);
      const code = codeArr.find((c) => React.isValidElement(c) && c.type === 'code');
      if (code && React.isValidElement(code)) {
        const lang = (code.props as Record<string, unknown>)['data-language'] as string | undefined;
        if (lang) return lang;
      }
    }
    return `Code ${idx + 1}`;
  }

  const tabListRef = React.useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    const count = items.length;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (idx + 1) % count;
      setActive(next);
      (tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next])?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (idx - 1 + count) % count;
      setActive(prev);
      (tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[prev])?.focus();
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="fw-codegroup">
      <div className="fw-codegroup-bar" role="tablist" ref={tabListRef}>
        {items.map((child, i) => (
          <button
            key={i}
            role="tab"
            id={`${uid}-cg-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`${uid}-cg-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            className={`fw-codegroup-trigger${active === i ? ' fw-codegroup-trigger--active' : ''}`}
            onClick={() => setActive(i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {titleOf(child, i)}
          </button>
        ))}
      </div>
      {items.map((child, i) => (
        <div
          key={i}
          role="tabpanel"
          id={`${uid}-cg-panel-${i}`}
          aria-labelledby={`${uid}-cg-tab-${i}`}
          hidden={active !== i}
          className="fw-codegroup-panel"
        >
          {child}
        </div>
      ))}
    </div>
  );
}
CodeGroup.displayName = 'CodeGroup';

/* ---------------------------------------------------------------------------
 * Accordion / AccordionGroup
 * -------------------------------------------------------------------------*/

export interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  icon?: React.ReactNode | string;
  children?: React.ReactNode;
}

/** A single collapsible section using native <details> for zero-JS fallback. */
export function Accordion({ title, defaultOpen = false, icon, children }: AccordionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  const iconNode =
    icon === undefined || icon === null
      ? null
      : typeof icon === 'string'
        ? <span className="fw-icon" data-icon={icon} aria-hidden="true" />
        : icon;

  return (
    <details
      className="fw-accordion"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="fw-accordion-summary">
        {iconNode && <span className="fw-accordion-icon">{iconNode}</span>}
        <span className="fw-accordion-title">{title}</span>
        <span className="fw-accordion-chevron" aria-hidden="true" />
      </summary>
      <div className="fw-accordion-body">{children}</div>
    </details>
  );
}
Accordion.displayName = 'Accordion';

export interface AccordionGroupProps {
  children?: React.ReactNode;
}

/** Wraps multiple <Accordion> items with shared border styling. */
export function AccordionGroup({ children }: AccordionGroupProps) {
  return <div className="fw-accordion-group">{children}</div>;
}
AccordionGroup.displayName = 'AccordionGroup';
