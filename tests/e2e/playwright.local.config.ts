import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = Number(process.env.E2E_PORT || 3002);
const e2eOrigin = `http://127.0.0.1:${E2E_PORT}`;
const repoRoot = path.resolve(__dirname, '..', '..');

export default defineConfig({
  testDir: '.',
  testIgnore: /remix-.*\.spec\.ts/,
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
  // Start CRA dev server on a local port to avoid conflicts with other services.
  // cwd must be the repo root: Playwright defaults webServer cwd to the config dir (tests/e2e).
  webServer: {
    command: `PORT=${E2E_PORT} npm run start:cra`,
    cwd: repoRoot,
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
