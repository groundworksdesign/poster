import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const REMIX_PORT = Number(process.env.REMIX_PORT || process.env.PORT || 3000);
const origin = `http://127.0.0.1:${REMIX_PORT}`;
const repoRoot = path.resolve(__dirname, '..', '..');
const ensureRemixPublicIndex = path.join(repoRoot, 'scripts', 'ensure-remix-public-index.cjs');

/**
 * E2E against `remix dev` (not CRA). Root playwright.config.ts uses start:cra on 3001.
 *
 * Specs that spawn production `server.js` (song-library UI, library relaunch/repoint)
 * live in playwright.remix.song-library.config.ts — remix-dev writes a jsxDEV build/
 * that would make those spawns return 500 on `/`.
 */
export default defineConfig({
  testDir: '.',
  testMatch: /remix-.*\.spec\.ts/,
  testIgnore: [
    /remix-song-library\.spec\.ts/,
    /remix-library-relaunch\.spec\.ts/,
    /remix-library-repoint\.spec\.ts/,
  ],
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
    command: `node "${ensureRemixPublicIndex}" && PORT=${REMIX_PORT} pnpm exec remix dev`,
    cwd: repoRoot,
    url: `${origin}/deck`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
