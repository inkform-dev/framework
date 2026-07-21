'use client';

import { useState } from 'react';

/** Real test widget proving MDX/CMS content can render a user-registered component, not the Fallback placeholder. */
export function Counter({ start = 0 }: { start?: number }) {
  const [count, setCount] = useState(start);
  return (
    <button type="button" className="fw-widget-counter" onClick={() => setCount((c) => c + 1)}>
      Widget count: {count}
    </button>
  );
}
