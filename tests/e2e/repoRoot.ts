import fs from 'node:fs';
import path from 'node:path';

/**
 * Repository root from tests/e2e (two levels up). Do not use a single `..`:
 * that resolves to tests/ after the e2e/ → tests/e2e move.
 */
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

export function assertRepoRoot(root: string = REPO_ROOT): string {
  const packageJson = path.join(root, 'package.json');
  const electronMain = path.join(root, 'src', 'adapters', 'electron', 'main.cjs');
  const sampleDeck = path.join(root, 'public', 'sample-slide-deck.json');
  if (!fs.existsSync(packageJson)) {
    throw new Error(`E2E repo root missing package.json: ${root}`);
  }
  if (!fs.existsSync(electronMain)) {
    throw new Error(`E2E repo root missing Electron main: ${electronMain}`);
  }
  if (!fs.existsSync(sampleDeck)) {
    throw new Error(`E2E repo root missing sample deck: ${sampleDeck}`);
  }
  return root;
}
