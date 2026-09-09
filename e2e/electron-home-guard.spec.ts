import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeSandbox, launchPosterApp, waitForHome, closeApp } from './electronHelpers';
import type { ElectronApplication } from '@playwright/test';

test.describe.serial('Electron packaged flow: Home exposes no bare Open Present', () => {
  test('Home shows no bare Open Present CTA and no presenter hrefs', async () => {
    const sandbox = makeSandbox();
    const homeDir = path.join(sandbox, 'home');
    fs.mkdirSync(homeDir, { recursive: true });
    let app: ElectronApplication | undefined;

    try {
      app = await launchPosterApp({ home: homeDir, userDataDir: path.join(sandbox, 'user-data') });
      const home = await waitForHome(app);

      await expect(home.getByRole('link', { name: /^Open Present$/i })).toHaveCount(0);
      const hrefs = await home.locator('a[href]').evaluateAll((anchors) =>
        anchors.map((a) => (a as HTMLAnchorElement).getAttribute('href') || ''),
      );
      expect(
        hrefs.filter((href) => href.startsWith('/deck') || href.startsWith('/presentation')),
      ).toEqual(['/deck', '/deck', '/deck?focusImport=1']);
    } finally {
      await closeApp(app);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('bare /presentation route shows operator guidance', async () => {
    const sandbox = makeSandbox();
    const homeDir = path.join(sandbox, 'home');
    fs.mkdirSync(homeDir, { recursive: true });
    let app: ElectronApplication | undefined;

    try {
      app = await launchPosterApp({ home: homeDir, userDataDir: path.join(sandbox, 'user-data') });
      const home = await waitForHome(app);
      const origin = new URL(home.url()).origin;

      await home.goto(`${origin}/presentation`, { waitUntil: 'domcontentloaded' });
      await expect(home.getByText(/Open Present from the deck builder/i)).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await closeApp(app);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('bare window.open(/presentation) is denied and opens a deck instead', async () => {
    const sandbox = makeSandbox();
    const homeDir = path.join(sandbox, 'home');
    fs.mkdirSync(homeDir, { recursive: true });
    let app: ElectronApplication | undefined;

    try {
      app = await launchPosterApp({ home: homeDir, userDataDir: path.join(sandbox, 'user-data') });
      const home = await waitForHome(app);
      const origin = new URL(home.url()).origin;

      const deckPromise = app.waitForEvent('window');
      await home.evaluate((base) => {
        const w = window.open(`${base}/presentation`, '_blank');
        if (w) w.opener = null;
      }, origin);
      const opened = await deckPromise;

      const openedUrl = new URL(opened.url());
      expect(openedUrl.pathname).toBe('/deck');
    } finally {
      await closeApp(app);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});