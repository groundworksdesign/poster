import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  makeSandbox,
  launchPosterApp,
  waitForHome,
  openDeckWindow,
  openPresentWindow,
  closeApp,
} from './electronHelpers';
import type { ElectronApplication } from '@playwright/test';

const sampleDeck = {
  title: 'End blank deck',
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
      id: 'first',
      type: 'title',
      title: 'First slide',
      style: { backgroundColor: '#111', color: '#fff', height: '100%', width: '100%' },
    },
    {
      id: 'second',
      type: 'title',
      title: 'Second slide',
      style: { backgroundColor: '#222', color: '#fff', height: '100%', width: '100%' },
    },
  ],
};

test.describe.serial('Electron packaged flow: End blanks Present', () => {
  test('End clears the Present viewport and Start resumes at slide 1', async () => {
    const sandbox = makeSandbox();
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

      const { present } = await openPresentWindow(app, deck);
      await expect(present.getByText('Loading...')).toHaveCount(0, { timeout: 15000 });

      await deck.setInputFiles('input#file', {
        name: 'end-blank.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(sampleDeck)),
      });
      await deck.click('#load');
      await deck.waitForSelector('#slides');
      const skip = deck.getByRole('button', { name: /skip/i });
      if (await skip.isVisible().catch(() => false)) await skip.click();

      const controls = deck.getByTestId('presentation-controls');
      await controls.getByRole('button', { name: 'Start' }).click();
      await expect(present.getByText('First slide')).toBeVisible({ timeout: 15000 });

      await controls.getByRole('button', { name: 'End' }).click();
      await expect(present.getByText('First slide')).toHaveCount(0, { timeout: 15000 });
      await expect(present.getByText('Second slide')).toHaveCount(0);
      await expect(controls).toContainText('Blank');

      await controls.getByRole('button', { name: 'Start' }).click();
      await expect(present.getByText('First slide')).toBeVisible({ timeout: 15000 });
    } finally {
      await closeApp(app);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});