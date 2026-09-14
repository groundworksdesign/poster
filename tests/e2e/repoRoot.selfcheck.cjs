/**
 * Lightweight guard: repoRoot helpers must resolve the real repository root
 * (package.json + Electron main), not tests/.
 *
 * Run: node tests/e2e/repoRoot.selfcheck.cjs
 */
const path = require('node:path');
const { REPO_ROOT, assertRepoRoot } = require('./repoRoot.cjs');

assertRepoRoot(REPO_ROOT);

const wrong = path.resolve(__dirname, '..');
if (wrong === REPO_ROOT) {
  throw new Error('REPO_ROOT incorrectly equals tests/');
}

const pkg = require(path.join(REPO_ROOT, 'package.json'));
if (!pkg || pkg.name !== 'poster') {
  throw new Error(`Expected poster package at ${REPO_ROOT}`);
}

console.log('repoRoot.selfcheck: ok ->', REPO_ROOT);
