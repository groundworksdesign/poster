/**
 * Electron smoke loads the on-disk Remix build/ under NODE_ENV=production.
 * Remix e2e (remix dev) can leave a development build that uses jsxDEV and
 * SSR-500s Home as "Unexpected Server Error" — waitForHome then times out.
 * Ensure a production build before Electron specs (no-op when already production).
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const buildIndex = path.join(repoRoot, 'build', 'index.js');

module.exports = async function electronGlobalSetup() {
  const needsRebuild =
    !fs.existsSync(buildIndex) ||
    fs.readFileSync(buildIndex, 'utf8').includes('jsx-dev-runtime');

  if (!needsRebuild) return;

  const result = spawnSync(
    'pnpm',
    ['run', 'build:remix'],
    {
      cwd: repoRoot,
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );
  if (result.status !== 0) {
    throw new Error(
      'electron globalSetup: NODE_ENV=production pnpm run build:remix failed (required for Electron e2e)',
    );
  }
  if (
    !fs.existsSync(buildIndex) ||
    fs.readFileSync(buildIndex, 'utf8').includes('jsx-dev-runtime')
  ) {
    throw new Error(
      'electron globalSetup: build/index.js still looks like a Remix development build (jsx-dev-runtime)',
    );
  }
};
