import { test, expect } from '@playwright/test';

/**
 * REQ-003: theme persists across "restart" (new context) and Home reopen,
 * and applies on Home, deck, and Present windows.
 */
test.describe('persist theme all windows', () => {
  async function chooseTheme(page: import('@playwright/test').Page, themeId: string) {
    const select = page.getByLabel('Select theme');
    await expect(select).toBeVisible();
    // Wait for client hydrate from localStorage (SSR starts as light).
    await page.waitForFunction(() => {
      const el = document.querySelector('select[aria-label="Select theme"]');
      return Boolean(el);
    });
    await select.evaluate((el, value) => {
      const selectEl = el as HTMLSelectElement;
      selectEl.value = value;
      selectEl.dispatchEvent(new Event('input', { bubbles: true }));
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    }, themeId);
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('poster-theme')))
      .toBe(themeId);
    await expect(select).toHaveValue(themeId);
  }

  test('Home dropdown restore after new browser context (app restart)', async ({
    browser,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await chooseTheme(page, 'dracula');

    const storage = await context.storageState();
    await context.close();

    const restored = await browser.newContext({ storageState: storage });
    const home2 = await restored.newPage();
    await home2.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await expect(home2.getByLabel('Select theme')).toHaveValue('dracula', { timeout: 15000 });
    await expect
      .poll(async () => home2.evaluate(() => document.documentElement.dataset.theme))
      .toBe('dracula');
    await restored.close();
  });

  test('Home reopen in same context keeps dropdown and data-theme', async ({ page, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await chooseTheme(page, 'github-dark');

    await page.goto(`${base}/deck`, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe('github-dark');

    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Select theme')).toHaveValue('github-dark', { timeout: 15000 });
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe('github-dark');
  });

  test('deck and Present windows apply the stored theme', async ({ browser, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    const context = await browser.newContext();
    const home = await context.newPage();
    await home.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await chooseTheme(home, 'tokyo-night');

    const deck = await context.newPage();
    await deck.goto(`${base}/deck`, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(async () => deck.evaluate(() => document.documentElement.dataset.theme))
      .toBe('tokyo-night');

    const session = await deck.evaluate(async () => {
      const peerId = crypto.randomUUID();
      const reg = await (
        await fetch('/api/poster/deck-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ peerId, command: { type: 'register' } }),
        })
      ).json();
      const spawn = await (
        await fetch('/api/poster/deck-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ peerId, command: { type: 'spawn' } }),
        })
      ).json();
      return { sessionId: reg.sessionId as string, presentId: spawn.presentId as string };
    });

    const present = await context.newPage();
    await present.goto(
      `${base}/presentation?sessionId=${encodeURIComponent(session.sessionId)}&presentId=${encodeURIComponent(session.presentId)}`,
      { waitUntil: 'domcontentloaded' },
    );
    await expect(present.getByText('Loading...')).toHaveCount(0, { timeout: 15000 });
    await expect
      .poll(async () => present.evaluate(() => document.documentElement.dataset.theme))
      .toBe('tokyo-night');

    await context.close();
  });
});
