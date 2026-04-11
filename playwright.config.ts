import { defineConfig, devices } from '@playwright/test';

/** Dedicated port so Playwright does not fight `npm start` / server on :3000 */
const E2E_PORT = Number(process.env.E2E_PORT || 3001);
const e2eOrigin = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 90 * 1000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  retries: 0,
  workers: 1,
  use: {
    headless: true,
    baseURL: e2eOrigin,
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
  },
  // Use CRA dev server so index.html gets webpack-injected bundles. `node server/index.js` serves
  // raw `public/index.html` (no <script src>) → blank #root. See e2e/diagnostic-blank-page.spec.ts.
  webServer: {
    command: `PORT=${E2E_PORT} npm run start:cra`,
    url: `${e2eOrigin}/deck`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
