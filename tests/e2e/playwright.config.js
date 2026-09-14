const path = require('node:path');
const { defineConfig, devices } = require('@playwright/test');

const repoRoot = path.resolve(__dirname, '..', '..');

module.exports = defineConfig({
  testDir: '.',
  timeout: 30 * 1000,
  retries: 0,
  reporter: [['list']],
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'npm start',
    cwd: repoRoot,
    port: 3000,
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
