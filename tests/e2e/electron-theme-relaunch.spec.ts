import { _electron as electron, expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertRepoRoot, REPO_ROOT } from './repoRoot';

const root = assertRepoRoot(REPO_ROOT);
const electronPath = require('electron') as string;

test.describe('Electron durable theme persistence', () => {
  test('restores theme after a full process relaunch', async () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-electron-theme-'));
    const posterHome = path.join(sandbox, 'home');
    fs.mkdirSync(posterHome);
    const launch = async (userDataDir: string) =>
      electron.launch({
        executablePath: electronPath,
        args: [
          ...(process.env.CI || process.env.ELECTRON_DISABLE_SANDBOX ? ['--no-sandbox'] : []),
          `--user-data-dir=${userDataDir}`,
          root,
        ],
        env: { ...process.env, HOME: posterHome, POSTER_HOME: path.join(posterHome, '.poster') },
      });

    try {
      const first = await launch(path.join(sandbox, 'user-data-1'));
      const firstWindow = await first.firstWindow();
      await firstWindow.waitForLoadState('domcontentloaded');
      await firstWindow.getByLabel('Select theme').selectOption('dracula');
      await expect.poll(() => fs.existsSync(path.join(posterHome, '.poster', 'theme.json'))).toBe(true);
      await expect(firstWindow.getByLabel('Select theme')).toHaveValue('dracula');
      await first.close();

      const second = await launch(path.join(sandbox, 'user-data-2'));
      const secondWindow = await second.firstWindow();
      const homeUrl = new URL(await secondWindow.url());

      await expect(secondWindow.getByLabel('Select theme')).toHaveValue('dracula');
      await expect(secondWindow.locator('html')).toHaveAttribute('data-theme', 'dracula');

      await secondWindow.goto(`${homeUrl.origin}/deck`);
      await expect(secondWindow.locator('html')).toHaveAttribute('data-theme', 'dracula');

      await secondWindow.goto(
        `${homeUrl.origin}/presentation?sessionId=relaunch-theme&presentId=relaunch-theme`,
      );
      await expect(secondWindow.locator('html')).toHaveAttribute('data-theme', 'dracula');

      await second.close();
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
