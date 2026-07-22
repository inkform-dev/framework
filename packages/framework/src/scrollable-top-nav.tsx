'use client';

import * as React from 'react';

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/**
 * Horizontally scrollable top-nav row with edge fade + chevron hints on mobile.
 * Hints appear only when there is more content in that direction.
 */
export function ScrollableTopNav({ children }: { children: React.ReactNode }) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const update = React.useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;

    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [update, children]);

  const className = [
    'fw-topnav-scroll',
    canScrollLeft ? 'fw-topnav-scroll--can-left' : '',
    canScrollRight ? 'fw-topnav-scroll--can-right' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <div ref={trackRef} className="fw-topnav-scroll-track">
        {children}
      </div>
      <div className="fw-topnav-scroll-hint fw-topnav-scroll-hint--left" aria-hidden>
        <ChevronLeft />
      </div>
      <div className="fw-topnav-scroll-hint fw-topnav-scroll-hint--right" aria-hidden>
        <ChevronRight />
      </div>
    </div>
  );
}
