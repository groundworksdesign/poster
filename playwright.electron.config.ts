import { defineConfig } from '@playwright/test';

/** Electron smoke: launches Electron directly, no CRA/Remix dev server needed. */
export default defineConfig({
  testDir: './e2e',
  testMatch: /electron-.*\.spec\.ts/,
  timeout: 90 * 1000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    trace: 'on-first-retry',
  },
});