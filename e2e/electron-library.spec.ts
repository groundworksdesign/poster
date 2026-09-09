import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  makeSandbox,
  launchPosterApp,
  waitForHome,
  closeApp,
} from './electronHelpers';
import { hasLibraryStore, listLibraryRootFiles, LIBRARY_STORE_NAMES } from './libraryStoreHelpers';
import type { ElectronApplication, Page } from '@playwright/test';

const deck = {
  title: 'Durable packaged deck',
  date: '2026-09-06',
  location: 'Main stage',
  notes: '',
  useGreenScreen: false,
  slideStyles: {},
  slides: [],
};

async function saveDeck(page: Page, body: unknown): Promise<string> {
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

async function chooseLibraryRoot(
  app: ElectronApplication,
  page: Page,
  libraryRoot: string,
): Promise<void> {
  await app.evaluate(({ dialog }, chosenRoot) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [chosenRoot],
    });
  }, libraryRoot);
  await page.getByRole('button', { name: 'Change...' }).click();
  await expect(page.getByText(`Library folder: ${libraryRoot}`)).toBeVisible({
    timeout: 15000,
  });
}

test.describe.serial('Electron packaged flow: durable ~/.poster library', () => {
  test('defaults to HOME/.poster and survives a full quit + relaunch', async () => {
    const sandbox = makeSandbox();
    const homeDir = path.join(sandbox, 'home');
    fs.mkdirSync(homeDir, { recursive: true });
    let app: ElectronApplication | undefined;

    try {
      const firstUserData = path.join(sandbox, 'user-data-1');
      app = await launchPosterApp({ home: homeDir, userDataDir: firstUserData });
      const home = await waitForHome(app);
      const defaultRoot = path.join(homeDir, '.poster');
      await expect(home.getByText(`Library folder: ${defaultRoot}`)).toBeVisible({
        timeout: 15000,
      });

      await saveDeck(home, deck);
      // Accept sqlite or JSON fallback — whichever backend Electron's embedded server uses.
      await expect.poll(() => hasLibraryStore(defaultRoot)).toBe(true);

      await closeApp(app);
      app = undefined;

      const secondUserData = path.join(sandbox, 'user-data-2');
      const relaunched = await launchPosterApp({ home: homeDir, userDataDir: secondUserData });
      app = relaunched;
      const home2 = await waitForHome(relaunched);
      await expect(home2.getByText(`Library folder: ${defaultRoot}`)).toBeVisible({
        timeout: 15000,
      });
      await expect(
        home2.getByTestId('library-entry').filter({ hasText: deck.title }),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await closeApp(app);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('re-pointing the library leaves the default ~/.poster folder untouched', async () => {
    const sandbox = makeSandbox();
    const homeDir = path.join(sandbox, 'home');
    const defaultRoot = path.join(homeDir, '.poster');
    const newRoot = path.join(sandbox, 'new-library');
    const sentinel = path.join(defaultRoot, 'operator-note.txt');
    fs.mkdirSync(homeDir, { recursive: true });
    let app: ElectronApplication | undefined;

    try {
      app = await launchPosterApp({ home: homeDir, userDataDir: path.join(sandbox, 'user-data') });
      const home = await waitForHome(app);
      await expect(home.getByText(`Library folder: ${defaultRoot}`)).toBeVisible({
        timeout: 15000,
      });

      await saveDeck(home, { ...deck, title: 'Stay in default root' });
      await expect.poll(() => hasLibraryStore(defaultRoot)).toBe(true);
      fs.writeFileSync(sentinel, 'leave this library untouched');
      const oldStoreFiles = listLibraryRootFiles(defaultRoot).filter((name) =>
        LIBRARY_STORE_NAMES.includes(name as (typeof LIBRARY_STORE_NAMES)[number]),
      );

      await chooseLibraryRoot(app, home, newRoot);
      await expect(home.getByTestId('library-empty')).toBeVisible({ timeout: 15000 });

      // Old folder is left untouched: still exists, still holds its own deck store,
      // operator sentinel untouched (re-point must not move/delete the old root).
      // Note: defaultRoot is also the durable home, so library-settings.json may be
      // written here on re-point — that is settings, not a move of library data.
      expect(fs.existsSync(defaultRoot)).toBe(true);
      expect(hasLibraryStore(defaultRoot)).toBe(true);
      expect(
        listLibraryRootFiles(defaultRoot).filter((name) =>
          LIBRARY_STORE_NAMES.includes(name as (typeof LIBRARY_STORE_NAMES)[number]),
        ),
      ).toEqual(oldStoreFiles);
      expect(fs.readFileSync(sentinel, 'utf8')).toBe('leave this library untouched');

      // New root receives the next save (sqlite or JSON fallback).
      await saveDeck(home, { ...deck, title: 'In the new root' });
      await expect.poll(() => hasLibraryStore(newRoot)).toBe(true);

      // Re-pointing back to the default root still lists the old deck: data was
      // never moved or copied out of it.
      await chooseLibraryRoot(app, home, defaultRoot);
      await expect(
        home.getByTestId('library-entry').filter({ hasText: 'Stay in default root' }),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await closeApp(app);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});