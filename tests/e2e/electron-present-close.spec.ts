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
import type { ElectronApplication, Page } from '@playwright/test';

async function deckListOmits(deck: Page, presentId: string): Promise<boolean> {
  const list = deck.getByTestId('present-list');
  const empties = await deck.getByTestId('present-list-empty').count();
  if (empties > 0) return true;
  const texts = await list.allInnerTexts();
  if (texts.length === 0) return true;
  return !texts.join(' ').includes(presentId);
}

test.describe.serial('Electron packaged flow: closing Present cleans the deck list', () => {
  test('closing a Present BrowserWindow removes it from the deck present list', async () => {
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

      const { present, presentId } = await openPresentWindow(app, deck);
      await expect(present.getByText('Loading...')).toHaveCount(0, { timeout: 15000 });
      await expect(deck.getByTestId('present-list')).toContainText(presentId, { timeout: 15000 });

      await present.close();

      await expect.poll(() => deckListOmits(deck, presentId), { timeout: 15000 }).toBe(true);
    } finally {
      await closeApp(app);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});