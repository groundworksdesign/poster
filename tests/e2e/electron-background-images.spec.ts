import { test, expect, type ElectronApplication } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  makeSandbox,
  launchPosterApp,
  waitForHome,
  openDeckFromLibrary,
  openDeckWindow,
  openPresentWindow,
  closeApp,
} from './electronHelpers';
import { startLocalImageServer } from './localImageServer';

const TINY =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const libraryDeck = {
  title: 'Electron BG Roundtrip',
  date: '2026-10-10',
  location: 'Hall',
  notes: '',
  useGreenScreen: false,
  slideStyles: {},
  defaultBackground: { image: TINY, fit: 'fill', dim: 0.15 },
  defaultTitleTextBackground: { image: TINY, fit: 'fit', dim: 0 },
  slides: [
    {
      id: 'bg-title-1',
      type: 'title',
      title: 'Electron Title BG',
      subTitle: 'Roundtrip',
      style: { backgroundColor: '#111', color: '#fff', height: '100%', width: '100%' },
    },
  ],
};

async function saveDeck(page: import('@playwright/test').Page, body: unknown): Promise<string> {
  const result = await page.evaluate(async (value) => {
    const response = await fetch('/library/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    return (await response.json()) as { id?: string };
  }, body);
  if (!result.id) throw new Error(`Library save returned no id: ${JSON.stringify(result)}`);
  return result.id;
}

test.describe('Electron: background images save/reload', () => {
  test('AC-007: library save/reload keeps backgrounds in Present', async () => {
    const sandbox = makeSandbox('poster-electron-bg-');
    const homeDir = path.join(sandbox, 'home');
    fs.mkdirSync(homeDir, { recursive: true });
    let app: ElectronApplication | undefined;

    try {
      app = await launchPosterApp({
        home: homeDir,
        userDataDir: path.join(sandbox, 'user-data'),
      });
      const home = await waitForHome(app);

      await saveDeck(home, libraryDeck);
      await home.reload();
      await waitForHome(app);
      await expect(
        home.getByTestId('library-entry').filter({ hasText: libraryDeck.title }),
      ).toBeVisible({ timeout: 15000 });

      const deck = await openDeckFromLibrary(app, home, libraryDeck.title);
      await expect(deck.getByTestId('deck-session-ready')).toHaveAttribute('data-ready', 'true', {
        timeout: 15000,
      });
      await expect(deck.getByTestId('deck-bg-preview')).toBeVisible({ timeout: 15000 });
      await expect(deck.getByTestId('deck-title-bg-preview')).toBeVisible();

      const { present } = await openPresentWindow(app, deck);
      await expect(present.getByTestId('present-ready')).toBeVisible();
      await expect(deck.getByTestId('present-session-ready')).toHaveAttribute('data-ready', 'true', {
        timeout: 15000,
      });

      await deck.locator('#slides').getByRole('button', { name: 'Send' }).first().click();
      await expect(present.getByText('Electron Title BG')).toBeVisible({ timeout: 15000 });
      await expect(present.getByTestId('present-whole-bg')).toBeVisible();
      await expect(present.getByTestId('present-title-text-bg')).toBeVisible();
    } finally {
      await closeApp(app);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('REQ-008 unmocked: URL import through Electron packaged server stack', async () => {
    const img = await startLocalImageServer();
    const sandbox = makeSandbox('poster-electron-bg-url-');
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
        timeout: 20000,
      });
      await deck.getByRole('button', { name: /new deck/i }).click();
      await expect(deck.getByTestId('deck-background-defaults')).toBeVisible({ timeout: 15000 });
      // Real Express+Remix stack (no route mock); proves body is not consumed by express.json.
      await deck.getByTestId('deck-bg-url').pressSequentially(img.pngUrl);
      await deck.getByTestId('deck-bg-url-apply').click();
      await expect(deck.getByTestId('deck-bg-preview')).toBeVisible({ timeout: 15000 });
      await expect(deck.getByTestId('deck-bg-error')).toHaveCount(0);
    } finally {
      await closeApp(app);
      await img.close();
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
