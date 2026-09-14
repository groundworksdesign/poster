import { test, expect, type ElectronApplication } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  makeSandbox,
  launchPosterApp,
  waitForHome,
  openDeckWindow,
  openPresentWindow,
  closeApp,
} from './electronHelpers';

/**
 * REQ-007: After cold Open Present hydrates on Electron, Deck On Program must
 * mirror what Present shows (directed Present → Main → owning Deck path).
 * URL-only Present waits are not enough — openPresentWindow requires present-ready.
 */
const sampleDeck = {
  title: 'On Program Electron deck',
  date: '2026-01-01',
  location: '',
  useGreenScreen: false,
  notes: '',
  slideStyles: {
    general: {
      backgroundColor: '#000',
      color: '#fff',
      fontFamily: 'Arial',
      fontSize: '24px',
      height: '100%',
      width: '100%',
    },
  },
  slides: [
    {
      id: 'prog-1',
      type: 'title',
      title: 'On Program Electron',
      subTitle: 'Cold hydrate thumb',
      style: { backgroundColor: '#111', color: '#fff', height: '100%', width: '100%' },
    },
  ],
};

test.describe.serial('Electron: On Program after cold Present hydrate', () => {
  test('Send updates Deck thumbnail to match Present; End clears it', async () => {
    const sandbox = makeSandbox('poster-electron-on-program-');
    const homeDir = path.join(sandbox, 'home');
    fs.mkdirSync(homeDir, { recursive: true });
    let app: ElectronApplication | undefined;

    try {
      app = await launchPosterApp({
        home: homeDir,
        userDataDir: path.join(sandbox, 'user-data'),
      });
      const home = await waitForHome(app);
      const deck = await openDeckWindow(app, home);
      await expect(deck.getByTestId('deck-session-ready')).toHaveAttribute('data-ready', 'true', {
        timeout: 15000,
      });

      // Cold first-open: must leave Loading and reach present-ready before Send.
      const { present } = await openPresentWindow(app, deck);
      await expect(present.getByTestId('present-loading')).toHaveCount(0);
      await expect(present.getByTestId('present-ready')).toBeVisible();

      await deck.setInputFiles('input#file', {
        name: 'on-program.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(sampleDeck)),
      });
      await deck.click('#load');
      await deck.waitForSelector('#slides');
      const skip = deck.getByRole('button', { name: /skip/i });
      if (await skip.isVisible().catch(() => false)) await skip.click();

      await expect(deck.getByTestId('program-thumbnail-empty')).toBeVisible();

      const controls = deck.getByTestId('presentation-controls');
      await controls.getByRole('button', { name: 'Start' }).click();

      await expect(present.getByText('On Program Electron')).toBeVisible({ timeout: 15000 });
      await expect(deck.getByTestId('program-thumbnail-title')).toHaveText('On Program Electron', {
        timeout: 15000,
      });
      await expect(deck.getByTestId('program-thumbnail-subtitle')).toHaveText('Cold hydrate thumb');

      await controls.getByRole('button', { name: 'End' }).click();
      await expect(present.getByText('On Program Electron')).toHaveCount(0, { timeout: 15000 });
      await expect(deck.getByTestId('program-thumbnail-empty')).toBeVisible({ timeout: 15000 });
      await expect(deck.getByTestId('program-thumbnail-title')).toHaveCount(0);
    } finally {
      await closeApp(app);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
