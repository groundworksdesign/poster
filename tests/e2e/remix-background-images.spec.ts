import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const TINY =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const deckWithBackgrounds = {
  title: 'Background Images Remix',
  date: '2026-10-10',
  location: '',
  useGreenScreen: false,
  notes: '',
  slideStyles: {
    general: { backgroundColor: '#000', color: '#fff', fontSize: '24px' },
  },
  defaultBackground: { image: TINY, fit: 'fill', dim: 0.2 },
  defaultTitleTextBackground: { image: TINY, fit: 'fit', dim: 0.1 },
  slides: [
    {
      id: 't1',
      type: 'title',
      title: 'Title BG',
      subTitle: 'Layer',
      style: { backgroundColor: '#111', color: '#fff' },
    },
    {
      id: 'i1',
      type: 'image',
      title: 'Image on BG',
      file: TINY,
      style: {},
    },
    {
      id: 'g1',
      type: 'general',
      title: 'General BG',
      style: {},
    },
  ],
};

async function loadDeck(page: import('@playwright/test').Page, deck: object) {
  await page.setInputFiles('input#file', {
    name: 'bg-deck.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(deck)),
  });
  await page.click('#load');
  await page.waitForSelector('#slides');
  const skip = page.getByRole('button', { name: /skip/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

test.describe('epic-005 background images (remix)', () => {
  test('AC-001/002/004/009: Present shows layers; image picture on top; green screen keeps them', async ({
    browser,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    const context = await browser.newContext();
    const deckPage = await context.newPage();
    await deckPage.goto(`${base}/deck`, { waitUntil: 'domcontentloaded' });
    await expect(deckPage.getByTestId('deck-session-ready')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const [presentation] = await Promise.all([
      context.waitForEvent('page'),
      deckPage.getByTestId('open-present').click(),
    ]);
    await presentation.waitForLoadState('domcontentloaded');
    await expect(presentation.getByTestId('present-ready')).toBeVisible({ timeout: 15000 });

    await loadDeck(deckPage, deckWithBackgrounds);

    const sendButtons = deckPage.locator('#slides').getByRole('button', { name: 'Send' });
    await sendButtons.nth(0).click();
    await expect(presentation.getByText('Title BG')).toBeVisible({ timeout: 10000 });
    await expect(presentation.getByTestId('present-whole-bg')).toBeVisible();
    await expect(presentation.getByTestId('present-title-text-bg')).toBeVisible();

    await sendButtons.nth(1).click();
    await expect(presentation.getByTestId('present-image-picture')).toBeVisible({ timeout: 10000 });
    await expect(presentation.getByTestId('present-whole-bg')).toBeVisible();

    await deckPage.locator('label:has-text("Green screen") input[type="checkbox"]').check();
    await sendButtons.nth(0).click();
    await expect(presentation.getByTestId('present-whole-bg')).toBeVisible({ timeout: 10000 });
    await expect(presentation.getByTestId('present-title-text-bg')).toBeVisible();

    await context.close();
  });

  test('AC-003/007/008: override reset, failed URL, export/reimport round-trip', async ({
    page,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    await page.goto(`${base}/deck`, { waitUntil: 'domcontentloaded' });
    await loadDeck(page, deckWithBackgrounds);

    await page.getByRole('button', { name: 'Edit' }).first().click();
    await expect(page.getByTestId('slide-background-overrides')).toBeVisible();

    await page.route('**/missing-bg.png', (route) =>
      route.fulfill({ status: 404, body: 'missing' })
    );
    await page.getByTestId('slide-bg-url').fill('https://example.com/missing-bg.png');
    await page.getByTestId('slide-bg-url-apply').click();
    await expect(page.getByTestId('slide-bg-error')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('slide-bg-error')).toContainText(/Could not download/i);

    await page.getByTestId('slide-bg-fit').selectOption('tile');
    await page.getByTestId('save-slide-button').click();
    await expect(page.getByTestId('deck-slide-editor-panel')).toHaveCount(0);

    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByTestId('slide-bg-use-deck-default').click();
    await page.getByTestId('save-slide-button').click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#export').click(),
    ]);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const exported = JSON.parse(fs.readFileSync(downloadPath!, 'utf-8'));
    expect(exported.defaultBackground.image).toBe(TINY);
    expect(exported.slides[0].background).toBeUndefined();

    await page.setInputFiles('input#file', {
      name: 'reimport.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(exported)),
    });
    await page.click('#load');
    await page.waitForSelector('#slides');
    const skip = page.getByRole('button', { name: /skip/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await expect(page.getByTestId('deck-bg-preview')).toBeVisible();
  });

  test('AC-010: older deck without background fields opens unchanged', async ({ page, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    await page.goto(`${base}/deck`, { waitUntil: 'domcontentloaded' });
    const legacy = {
      title: 'Legacy Deck',
      date: '2026-01-01',
      location: '',
      useGreenScreen: false,
      notes: '',
      slideStyles: {},
      slides: [{ type: 'general', title: 'Old Slide', style: { backgroundColor: '#222' } }],
    };
    await loadDeck(page, legacy);
    await expect(page.getByText('Old Slide')).toBeVisible();
    await expect(page.getByTestId('deck-bg-empty')).toBeVisible();
    await expect(page.getByTestId('deck-title-bg-empty')).toBeVisible();
  });

  test('LIVE-OLDDECK: switching to an old deck with Present open clears prior background', async ({
    browser,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    const context = await browser.newContext();
    const deckPage = await context.newPage();
    await deckPage.goto(`${base}/deck`, { waitUntil: 'domcontentloaded' });
    await expect(deckPage.getByTestId('deck-session-ready')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const [presentation] = await Promise.all([
      context.waitForEvent('page'),
      deckPage.getByTestId('open-present').click(),
    ]);
    await presentation.waitForLoadState('domcontentloaded');
    await expect(presentation.getByTestId('present-ready')).toBeVisible({ timeout: 15000 });

    await loadDeck(deckPage, deckWithBackgrounds);
    await deckPage.locator('#slides').getByRole('button', { name: 'Send' }).first().click();
    await expect(presentation.getByTestId('present-whole-bg')).toBeVisible({ timeout: 10000 });

    const legacy = {
      title: 'Legacy After BG',
      date: '2026-01-01',
      location: '',
      useGreenScreen: false,
      notes: '',
      slideStyles: {},
      slides: [
        {
          type: 'general',
          title: 'Old After BG',
          style: { backgroundColor: '#336699', color: '#fff' },
        },
      ],
    };
    await loadDeck(deckPage, legacy);
    await deckPage.locator('#slides').getByRole('button', { name: 'Send' }).first().click();
    await expect(presentation.getByText('Old After BG')).toBeVisible({ timeout: 10000 });
    await expect(presentation.getByTestId('present-whole-bg')).toHaveCount(0);
    await expect(presentation.getByTestId('present-title-text-bg')).toHaveCount(0);

    await context.close();
  });

  test('LIVE-CLEAR: clearing deck default clears open Present background', async ({
    browser,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    const context = await browser.newContext();
    const deckPage = await context.newPage();
    await deckPage.goto(`${base}/deck`, { waitUntil: 'domcontentloaded' });
    await expect(deckPage.getByTestId('deck-session-ready')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const [presentation] = await Promise.all([
      context.waitForEvent('page'),
      deckPage.getByTestId('open-present').click(),
    ]);
    await presentation.waitForLoadState('domcontentloaded');
    await expect(presentation.getByTestId('present-ready')).toBeVisible({ timeout: 15000 });

    await loadDeck(deckPage, deckWithBackgrounds);
    await deckPage.locator('#slides').getByRole('button', { name: 'Send' }).first().click();
    await expect(presentation.getByTestId('present-whole-bg')).toBeVisible({ timeout: 10000 });
    await expect(presentation.getByTestId('present-title-text-bg')).toBeVisible();

    await deckPage.getByTestId('deck-bg-clear').click();
    await expect(presentation.getByTestId('present-whole-bg')).toHaveCount(0, { timeout: 10000 });

    await deckPage.getByTestId('deck-title-bg-clear').click();
    await expect(presentation.getByTestId('present-title-text-bg')).toHaveCount(0, {
      timeout: 10000,
    });

    await context.close();
  });
});

