import { test, expect, type ElectronApplication } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  makeSandbox,
  launchPosterApp,
  waitForHome,
  openDeckFromLibrary,
  openPresentWindow,
  closeApp,
} from './electronHelpers';

/**
 * REQ-008: Library Open → Open Present must leave SSR Loading and reach present-ready.
 * Blank-deck Open Present already passes; this covers the Library entry path that failed
 * on Jack tip 497d454 (SSR Loading ≥30s).
 */
const libraryDeck = {
  title: 'Library Open Present hydrate',
  date: '2026-09-14',
  location: 'Stage',
  notes: '',
  useGreenScreen: false,
  slideStyles: {},
  slides: [
    {
      id: 'lib-slide-1',
      type: 'title',
      title: 'Library hydrate',
      subTitle: 'REQ-008',
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

test.describe('Electron: Library Open → Present hydrate (REQ-008)', () => {
  test('Library Open then Open Present reaches present-ready (not SSR Loading hang)', async () => {
    const sandbox = makeSandbox('poster-electron-lib-present-');
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

      // Library-opened Deck must expose the preload bridge so Open Present uses
      // electron-direct + main-owned present-session (not about:blank / present-blank).
      const hasPosterBridge = await deck.evaluate(
        () => typeof (window as Window & { poster?: unknown }).poster !== 'undefined',
      );
      expect(hasPosterBridge).toBe(true);

      const { present } = await openPresentWindow(app, deck);
      await expect(present.getByTestId('present-loading')).toHaveCount(0);
      await expect(present.getByTestId('present-ready')).toBeVisible();
    } finally {
      await closeApp(app);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
