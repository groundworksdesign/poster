import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const electronPath = require('electron') as string;

export type LaunchPosterOptions = {
  home: string;
  userDataDir: string;
  posterHome?: string;
};

export type LaunchPosterResult = {
  app: ElectronApplication;
  home: Page;
};

/**
 * Fresh temp sandbox dedicated to one launch/test.
 */
export function makeSandbox(prefix = 'poster-electron-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Launch the real Electron app (electron/main.cjs wraps the embedded Express/Remix
 * server) with an isolated HOME / user-data dir so it never touches a real profile.
 * POSTER_HOME is intentionally not set unless the caller supplies one, so
 * "default ~/.poster" behavior is what is exercised by default.
 */
export async function launchPosterApp(opts: LaunchPosterOptions): Promise<ElectronApplication> {
  const env: Record<string, string> = { ...process.env, HOME: opts.home };
  delete env.POSTER_HOME;
  delete env.POSTER_LIBRARY_PATH;
  delete env.POSTER_DB_PATH;
  delete env.POSTER_LIBRARY_JSON_PATH;
  if (opts.posterHome) {
    env.POSTER_HOME = opts.posterHome;
  }
  return electron.launch({
    executablePath: electronPath,
    args: [`--user-data-dir=${opts.userDataDir}`, root],
    env,
  });
}

/**
 * Return the app's main Home window once it has rendered.
 */
export async function waitForHome(app: ElectronApplication): Promise<Page> {
  const home = await app.firstWindow();
  await home.waitForLoadState('domcontentloaded');
  await home.getByRole('heading', { name: 'Poster', level: 1 }).waitFor({ timeout: 15000 });
  return home;
}

/**
 * Open the deck builder window from Home (window.open -> Electron BrowserWindow).
 */
export async function openDeckWindow(app: ElectronApplication, home: Page): Promise<Page> {
  const deckPromise = app.waitForEvent('window');
  await home.getByTestId('open-presentation').click();
  const deck = await deckPromise;
  await deck.waitForLoadState('domcontentloaded');
  return deck;
}

/**
 * Open a Present window from the deck (window.open -> Electron BrowserWindow)
 * and wait until it leaves the loading state.
 */
export async function openPresentWindow(
  app: ElectronApplication,
  deck: Page,
): Promise<{ present: Page; presentId: string }> {
  const presentPromise = app.waitForEvent('window');
  await deck.getByTestId('open-present').click();
  const present = await presentPromise;
  await present.waitForLoadState('domcontentloaded');
  const url = new URL(present.url());
  const presentId = url.searchParams.get('presentId');
  if (!presentId) {
    throw new Error(`Present window URL missing presentId: ${present.url()}`);
  }
  return { present, presentId };
}

export async function closeApp(app: ElectronApplication | undefined): Promise<void> {
  if (!app) return;
  try {
    await app.close();
  } catch {
    // already gone
  }
}