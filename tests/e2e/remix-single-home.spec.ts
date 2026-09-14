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

  test('Home exposes no bare Open Present action or presenter route', async ({ page, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: /^Open Present$/i })).toHaveCount(0);
    const hrefs = await page.locator('a[href]').evaluateAll((anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).getAttribute('href') || ''),
    );
    expect(hrefs.filter((href) => href.startsWith('/deck') || href.startsWith('/presentation'))).toEqual([
      '/deck',
      '/deck',
      '/deck?focusImport=1',
    ]);
  });

  test('Present window is created by deck Open Present, not Home', async ({
    context,
    page,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });

    const [deckPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('open-presentation').click(),
    ]);
    await deckPage.waitForLoadState('domcontentloaded');
    await expect(deckPage.getByTestId('open-present')).toBeEnabled({ timeout: 15000 });

    const [presentPage] = await Promise.all([
      context.waitForEvent('page'),
      deckPage.getByTestId('open-present').click(),
    ]);
    await presentPage.waitForURL(/\/presentation\?sessionId=[^&]+&presentId=[^&]+/, {
      timeout: 15000,
    });

    await presentPage.close();
    await deckPage.close();
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
