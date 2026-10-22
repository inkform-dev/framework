import { defineConfig, devices } from '@playwright/test';

/**
 * Browser checks against a production build of this site, served by the
 * Node adapter: pages render, the kit's interactive parts work without
 * React, search finds pages, and the CSP holds. `webServer` builds and
 * serves the site itself, so `npm run test:e2e` is self-contained.
 */
const PORT = 4322;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start',
    env: { HOST: '127.0.0.1', PORT: String(PORT) },
    url: `http://127.0.0.1:${PORT}/docs`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
