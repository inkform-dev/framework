import { defineConfig, devices } from '@playwright/test';

/**
 * A real-browser smoke test against a real production build — complements
 * (doesn't replace) the framework's Vitest unit tests. `webServer` builds
 * and serves this exact app itself, so `npx playwright test` is a
 * self-contained, one-shot "does the actual shipped output work" check, the
 * same thing this repo's own development has repeatedly verified by hand
 * this project (real build → real server → real requests) rather than
 * trusting typecheck alone.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start -- -p 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
