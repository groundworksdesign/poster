import { defineConfig, devices } from '@playwright/test';

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
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
