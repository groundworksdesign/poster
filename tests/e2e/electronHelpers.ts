import { _electron as electron, expect, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertRepoRoot, REPO_ROOT } from './repoRoot';

const root = assertRepoRoot(REPO_ROOT);
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
 * Launch the real Electron app (src/adapters/electron/main.cjs wraps the embedded
 * Express/Remix server) with an isolated HOME / user-data dir so it never touches a real profile.
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
  // CI runners cannot configure chrome-sandbox setuid; Electron aborts without this.
  const args = [`--user-data-dir=${opts.userDataDir}`, root];
  if (process.env.CI || process.env.ELECTRON_DISABLE_SANDBOX) {
    args.unshift('--no-sandbox');
  }
  return electron.launch({
    executablePath: electronPath,
    args,
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
 * Open a Present window from the deck (window.open -> Electron BrowserWindow).
 * Waits until Present has client-hydrated (not merely until the URL navigates).
 * URL-only waits are false comfort: SSR can sit on "Loading..." forever, and
 * On Program thumbnails never update until present-ready (REQ-006/007).
 */
export async function openPresentWindow(
  app: ElectronApplication,
  deck: Page,
): Promise<{ present: Page; presentId: string }> {
  const presentPromise = app.waitForEvent('window');
  await deck.getByTestId('open-present').click();
  const present = await presentPromise;
  // Electron opens the absolute /presentation?... URL directly (no about:blank).
  await present.waitForURL(
    (url) => url.pathname.includes('/presentation') && !!url.searchParams.get('presentId'),
    { timeout: 30_000 },
  );
  await present.waitForLoadState('domcontentloaded');
  // Prove Remix client hydrate + Present session boot — SSR "Loading..." alone must fail.
  await present.getByTestId('present-ready').waitFor({ state: 'visible', timeout: 30_000 });
  await expect(present.getByTestId('present-loading')).toHaveCount(0);
  const hasPosterBridge = await present.evaluate(
    () => typeof (window as Window & { poster?: { presentEvent?: unknown } }).poster?.presentEvent === 'function',
  );
  if (!hasPosterBridge) {
    throw new Error('Present window hydrated without window.poster — preload missing on cold open');
  }
  const url = new URL(present.url());
  const presentId = url.searchParams.get('presentId');
  if (!presentId) {
    throw new Error(`Present window URL missing presentId: ${present.url()}`);
  }
  return { present, presentId };
}


/**
 * Open a deck via Home Library Open (REQ-008 path — must hydrate Present like blank-deck).
 */
export async function openDeckFromLibrary(
  app: ElectronApplication,
  home: Page,
  entryTitle?: string,
): Promise<Page> {
  const deckPromise = app.waitForEvent('window');
  const entry = entryTitle
    ? home.getByTestId('library-entry').filter({ hasText: entryTitle })
    : home.getByTestId('library-entry').first();
  await entry.getByTestId('library-open-btn').click();
  const deck = await deckPromise;
  await deck.waitForLoadState('domcontentloaded');
  return deck;
}

export async function closeApp(app: ElectronApplication | undefined): Promise<void> {
  if (!app) return;
  try {
    await app.close();
  } catch {
    // already gone
  }
}