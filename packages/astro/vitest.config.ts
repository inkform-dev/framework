import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Rendering MDX with Shiki and indexing with Pagefind take a moment on a cold start.
    testTimeout: 30_000,
  },
});
