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

async function setLibraryRoot(page: Page, libraryRoot: string): Promise<void> {
  const result = await page.evaluate(async (root) => {
    const response = await fetch('/library/settings?_data=routes%2Flibrary.settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ libraryRoot: root }),
    });
    return { ok: response.ok, body: (await response.json()) as { libraryRoot?: string } };
  }, libraryRoot);
  expect(result.ok).toBe(true);
  expect(result.body.libraryRoot).toBe(libraryRoot);
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
      await expect.poll(() => fs.existsSync(path.join(defaultRoot, 'poster.sqlite'))).toBe(true);

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
      await expect.poll(() => fs.existsSync(path.join(defaultRoot, 'poster.sqlite'))).toBe(true);
      fs.writeFileSync(sentinel, 'leave this library untouched');

      await setLibraryRoot(home, newRoot);
      await home.reload({ waitUntil: 'domcontentloaded' });
      await expect(home.getByText(`Library folder: ${newRoot}`)).toBeVisible({ timeout: 15000 });

      // Old folder is left untouched: still exists, still holds its own deck data,
      // no JSON fallback introduced, operator file untouched.
      expect(fs.existsSync(defaultRoot)).toBe(true);
      expect(fs.existsSync(path.join(defaultRoot, 'poster.sqlite'))).toBe(true);
      expect(fs.existsSync(path.join(defaultRoot, 'poster.library.json'))).toBe(false);
      expect(fs.readFileSync(sentinel, 'utf8')).toBe('leave this library untouched');

      // New root receives the next save.
      await saveDeck(home, { ...deck, title: 'In the new root' });
      await expect.poll(() => fs.existsSync(path.join(newRoot, 'poster.sqlite'))).toBe(true);

      // Re-pointing back to the default root still lists the old deck: data was
      // never moved or copied out of it.
      await setLibraryRoot(home, defaultRoot);
      await home.reload({ waitUntil: 'domcontentloaded' });
      await expect(home.getByText(`Library folder: ${defaultRoot}`)).toBeVisible({
        timeout: 15000,
      });
      await expect(
        home.getByTestId('library-entry').filter({ hasText: 'Stay in default root' }),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await closeApp(app);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});