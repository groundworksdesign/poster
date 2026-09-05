import { test, expect } from '@playwright/test';

/**
 * Deck UI → Present via Open Present + Send (session transport, not BroadcastChannel).
 */
test('deck Open Present + Send updates presentation', async ({ browser, baseURL }) => {
  const base = baseURL || 'http://127.0.0.1:3000';
  const context = await browser.newContext();
  const deckPage = await context.newPage();
  await deckPage.goto(`${base}/deck`, { waitUntil: 'domcontentloaded' });

  await expect(deckPage.getByTestId('present-targets')).toBeVisible();
  await expect(deckPage.getByTestId('send-target')).toHaveValue('all');

  const [presentation] = await Promise.all([
    context.waitForEvent('page'),
    deckPage.getByRole('button', { name: /open present/i }).click(),
  ]);
  await presentation.waitForLoadState('domcontentloaded');
  await expect(presentation.getByText('Loading...')).toHaveCount(0, { timeout: 15000 });

  await expect(deckPage.getByTestId('present-list')).toBeVisible({ timeout: 10000 });

  const deck = {
    title: 'Test Deck',
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
        title: 'Slide 1',
        style: { backgroundColor: '#111', color: '#fff', height: '100%', width: '100%' },
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
  // Dismiss optional import-save prompt if present
  const skip = deckPage.getByRole('button', { name: /skip/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
  await deckPage.click('#slides button:has-text("Send")');

  await expect(presentation.getByText('Slide 1')).toBeVisible({ timeout: 10000 });
  await context.close();
});
