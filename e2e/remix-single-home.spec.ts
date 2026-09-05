import { test, expect } from '@playwright/test';

/**
 * REQ-002 single Home: Open Presentation opens a deck; Home stays;
 * Home does not launch bare /presentation without a session.
 */
test.describe('single Home / Open Presentation', () => {
  test('Open Presentation opens /deck while Home stays put', async ({ context, page, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Poster', level: 1 })).toBeVisible();

    const openPresentation = page.getByTestId('open-presentation');
    await expect(openPresentation).toHaveAttribute('href', '/deck');

    const [deckPage] = await Promise.all([
      context.waitForEvent('page'),
      openPresentation.click(),
    ]);
    await deckPage.waitForLoadState('domcontentloaded');

    expect(deckPage.url()).toMatch(/\/deck/);
    await expect(deckPage.getByText(/Deck/i).first()).toBeVisible({ timeout: 15000 });

    // Home still showing library / Home copy
    await expect(page.getByRole('heading', { name: 'Poster', level: 1 })).toBeVisible();
    await expect(page.getByText(/library of saved presentations/i)).toBeVisible();
  });

  test('Home has no bare /presentation link', async ({ page, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });

    const hrefs = await page.locator('a[href]').evaluateAll((anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).getAttribute('href') || ''),
    );
    const barePresent = hrefs.filter(
      (h) =>
        h === '/presentation' ||
        (h.startsWith('/presentation') && !h.includes('sessionId=')),
    );
    expect(barePresent).toEqual([]);
  });

  test('bare /presentation shows connect guidance (not a Home-spawned program feed)', async ({
    page,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    await page.goto(`${base}/presentation`, { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(/Open Present from the deck builder/i),
    ).toBeVisible({ timeout: 15000 });
  });
});
