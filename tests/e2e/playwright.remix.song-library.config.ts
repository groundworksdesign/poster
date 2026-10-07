import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Production Remix (server.js) e2e for song-library routes.
 * Separate from playwright.remix.config.ts so build:remix never races remix-dev assets.
 */
const PORT = Number(process.env.SONG_LIBRARY_E2E_PORT || process.env.PORT || 3010);
const origin = `http://127.0.0.1:${PORT}`;
const repoRoot = path.resolve(__dirname, '..', '..');
const webServerScript = path.join(repoRoot, 'scripts', 'e2e-song-library-webserver.cjs');

export default defineConfig({
  testDir: '.',
  testMatch: /remix-song-library\.spec\.ts/,
  timeout: 90 * 1000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    headless: true,
    baseURL: origin,
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
  },
  webServer: {
    command: `node "${webServerScript}"`,
    cwd: repoRoot,
    url: `${origin}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      PORT: String(PORT),
      SONG_LIBRARY_E2E_PORT: String(PORT),
      NODE_ENV: 'production',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
