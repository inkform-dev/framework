import { useState } from 'react';

/** A React island on the host's own page, to show the docs pages don't load React. */
export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" data-counter onClick={() => setCount((c) => c + 1)}>
      Clicked {count} times
    </button>
  );
}
