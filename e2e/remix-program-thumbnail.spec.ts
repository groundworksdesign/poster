import { test, expect } from '@playwright/test';

/**
 * REQ-004: deck shows a thumbnail of what is on program via directed
 * Present → Main (present-event) → owning deck (deck-event) path.
 */
test('deck shows program thumbnail after Present receives a send', async ({ browser, baseURL }) => {
  const base = baseURL || 'http://127.0.0.1:3000';
  const context = await browser.newContext();
  const deckPage = await context.newPage();
  await deckPage.goto(`${base}/deck`, { waitUntil: 'domcontentloaded' });

  await expect(deckPage.getByTestId('program-thumbnail-empty')).toBeVisible();

  const [presentation] = await Promise.all([
    context.waitForEvent('page'),
    deckPage.getByRole('button', { name: /open present/i }).click(),
  ]);
  await presentation.waitForLoadState('domcontentloaded');
  await expect(presentation.getByText('Loading...')).toHaveCount(0, { timeout: 15000 });
  await expect(deckPage.getByTestId('present-list')).toBeVisible({ timeout: 10000 });

  const deck = {
    title: 'Thumb Deck',
    date: '2026-01-01',
    location: '',
    useGreenScreen: false,
    notes: '',
    slideStyles: {
      general: {
        backgroundColor: '#000',
        color: '#fff',
        fontFamily: 'Arial',
        fontSize: '24px',
        height: '100%',
        width: '100%',
      },
    },
    slides: [
      {
        id: 's1',
        type: 'title',
        title: 'On Program Now',
        subTitle: 'Thumbnail check',
        style: { backgroundColor: '#1a1a2e', color: '#eee', height: '100%', width: '100%' },
      },
    ],
  };

  await deckPage.setInputFiles('input#file', {
    name: 'deck.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(deck)),
  });
  await deckPage.click('#load');
  await deckPage.waitForSelector('#slides');
  const skip = deckPage.getByRole('button', { name: /skip/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
  await deckPage.click('#slides button:has-text("Send")');

  await expect(presentation.getByText('On Program Now')).toBeVisible({ timeout: 10000 });
  await expect(deckPage.getByTestId('program-thumbnail-title')).toHaveText('On Program Now', {
    timeout: 10000,
  });
  await expect(deckPage.getByTestId('program-thumbnail-subtitle')).toHaveText('Thumbnail check');

  await context.close();
});
