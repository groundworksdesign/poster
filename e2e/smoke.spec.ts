import { test, expect } from '@playwright/test';

test('deck send updates presentation', async ({ browser }) => {
  // Use a single context so BroadcastChannel messages route between pages
  const context = await browser.newContext();
  const presentation = await context.newPage();
  await presentation.goto('/presentation');

  const deckPage = await context.newPage();
  await deckPage.goto('/deck');

  const deck = {
    title: 'Test Deck',
    date: '2026-01-01',
    location: '',
    useGreenScreen: false,
    notes: '',
    slideStyles: {
      general: { backgroundColor: '#000', color: '#fff', fontFamily: 'Arial', fontSize: '24px', height: '100%', width: '100%' },
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

  // Upload the deck JSON via the file input
  await deckPage.setInputFiles('input#file', {
    name: 'deck.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(deck)),
  });

  // Click the Load button
  await deckPage.click('#load');

  // Wait for slides list and click the first Send button
  await deckPage.waitForSelector('#slides');
  await deckPage.click('#slides button:has-text("Send")');

  // Assert presentation rendered the slide/title
  await expect(presentation.locator('text=Slide 1')).toBeVisible();
});
