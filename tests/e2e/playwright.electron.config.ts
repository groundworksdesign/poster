import { defineConfig } from '@playwright/test';
import path from 'node:path';

/** Electron smoke: launches Electron directly, no CRA/Remix dev server needed. */
export default defineConfig({
  testDir: '.',
  testMatch: /electron-.*\.spec\.ts/,
  globalSetup: path.join(__dirname, 'electron.global-setup.cjs'),
  timeout: 90 * 1000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    trace: 'on-first-retry',
  },
});