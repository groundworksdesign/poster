import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
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
 * REQ-010: present-ready when URL already has presentId + preload (not about:blank).
 * Stress cold Open Present repeats in one session — Jack tip c3a1642 failed ~58%
 * on AppImage with preload + real presentId still stuck on SSR Loading.
 */
const STRESS_OPENS = 3;

async function assertPresentHydratedWithRealUrl(present: Page) {
  const url = new URL(present.url());
  expect(url.pathname).toContain('/presentation');
  expect(url.searchParams.get('presentId')).toBeTruthy();
  expect(url.href).not.toMatch(/^about:blank/i);

  const hasPosterBridge = await present.evaluate(
    () =>
      typeof (window as Window & { poster?: { presentEvent?: unknown } }).poster?.presentEvent ===
      'function',
  );
  expect(hasPosterBridge).toBe(true);

  const clientBoot = await present.evaluate(
    () =>
      !!(window as Window & { __posterPresentClientBoot?: boolean }).__posterPresentClientBoot,
  );
  expect(clientBoot).toBe(true);

  await expect(present.getByTestId('present-ready')).toBeVisible({ timeout: 30_000 });
  await expect(present.getByTestId('present-loading')).toHaveCount(0);
}

test.describe('Electron: Present hydrate with real presentId URL (REQ-010)', () => {
  test(`cold Open Present reaches present-ready ${STRESS_OPENS}× with presentId URL + preload`, async () => {
    const sandbox = makeSandbox('poster-electron-present-hydrate-stress-');
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

      for (let i = 0; i < STRESS_OPENS; i += 1) {
        const { present } = await openPresentWindow(app, deck);
        await assertPresentHydratedWithRealUrl(present);
        await present.close();
        // Brief pause between cold opens (AppImage FUSE race target).
        await deck.waitForTimeout(250);
      }
    } finally {
      await closeApp(app);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
