const fs = require('node:fs');
const path = require('node:path');

/** Repository root from tests/e2e (two levels up). */
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function assertRepoRoot(root = REPO_ROOT) {
  const packageJson = path.join(root, 'package.json');
  const electronMain = path.join(root, 'src', 'adapters', 'electron', 'main.cjs');
  if (!fs.existsSync(packageJson) || !fs.existsSync(electronMain)) {
    throw new Error(`E2E repo root looks wrong: ${root}`);
  }
  return root;
}

module.exports = { REPO_ROOT, assertRepoRoot };
