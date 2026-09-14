import { test, expect } from '@playwright/test';

/**
 * Regression: Remix SSR must not 500. A bad `isbot` major (v5+) breaks default import in
 * @remix-run/dev entry.server → blank / error document in the browser.
 */
test.describe('Remix dev', () => {
  test('/deck renders deck UI (no server 500)', async ({ page }) => {
    const failures: string[] = [];
    page.on('response', res => {
      if (res.status() >= 500) {
        failures.push(`${res.status()} ${res.url()}`);
      }
    });
    page.on('pageerror', err => failures.push(`pageerror: ${err.message}`));

    // domcontentloaded: deck poster poll keeps long-lived requests open, so networkidle never settles.
    const res = await page.goto('/deck', { waitUntil: 'domcontentloaded' });
    expect(res?.status(), `document status (failures: ${failures.join('; ')})`).toBeLessThan(500);

    await expect(page.getByText(/Deck builder connected|Load deck|Deck/i).first()).toBeVisible({
      timeout: 15000,
    });

    expect(failures, 'no 5xx or uncaught errors').toEqual([]);
  });

  test('home / renders Poster (root index route)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Poster', level: 1 })).toBeVisible({
      timeout: 15000,
    });
  });
});
