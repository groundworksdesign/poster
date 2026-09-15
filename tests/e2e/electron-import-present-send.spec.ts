import { test, expect, type ElectronApplication } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  makeSandbox,
  launchPosterApp,
  waitForHome,
  openDeckFromImportFile,
  openPresentWindow,
  closeApp,
} from './electronHelpers';

/**
 * REQ-009: Import file → cold Open Present → directed send.
 * Jack tip 7c947cd AppImage failed this order flakily (~1/3–1/2); tip Electron
 * rarely hits the FUSE/preload race. electron-program-thumbnail opens Present
 * *before* import — that does not catch the post-import cold-open flake.
 */
const importDeck = {
  title: 'Import then Present send',
  date: '2026-09-15',
  location: 'Hall',
  notes: '',
  useGreenScreen: false,
  slideStyles: {},
  slides: [
    {
      id: 'import-slide-1',
      type: 'title',
      title: 'Post-import Present',
      subTitle: 'REQ-009',
      style: { backgroundColor: '#111', color: '#fff', height: '100%', width: '100%' },
    },
  ],
};

test.describe('Electron: Import → Present → send (REQ-009)', () => {
  test('Import a file then cold Open Present reaches ready and Start/send works', async () => {
    const sandbox = makeSandbox('poster-electron-import-present-');
    const homeDir = path.join(sandbox, 'home');
    fs.mkdirSync(homeDir, { recursive: true });
    let app: ElectronApplication | undefined;

    try {
      app = await launchPosterApp({
        home: homeDir,
        userDataDir: path.join(sandbox, 'user-data'),
      });
      const home = await waitForHome(app);

      const deck = await openDeckFromImportFile(app, home, {
        name: 'import-present.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(importDeck)),
      });

      // Import path must expose preload so Open Present uses electron-direct
      // (not about:blank) after FileReader I/O — AppImage FUSE race target.
      const hasPosterBridge = await deck.evaluate(
        () => typeof (window as Window & { poster?: unknown }).poster !== 'undefined',
      );
      expect(hasPosterBridge).toBe(true);

      const { present } = await openPresentWindow(app, deck);
      await expect(present.getByTestId('present-loading')).toHaveCount(0);
      await expect(present.getByTestId('present-ready')).toBeVisible();

      // Deck must see Present child-ready before Start is enabled (send race gate).
      await expect(deck.getByTestId('present-session-ready')).toHaveAttribute('data-ready', 'true', {
        timeout: 15000,
      });
      const start = deck.getByTestId('presentation-start');
      await expect(start).toBeEnabled({ timeout: 15000 });
      await start.click();

      await expect(present.getByText('Post-import Present')).toBeVisible({ timeout: 15000 });
      await expect(deck.getByTestId('program-thumbnail-title')).toHaveText('Post-import Present', {
        timeout: 15000,
      });
      await expect(deck.getByTestId('program-thumbnail-subtitle')).toHaveText('REQ-009');
    } finally {
      await closeApp(app);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
