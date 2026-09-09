import { test, expect } from '@playwright/test';

test('End blanks Present and Start resumes at the first slide', async ({ browser, baseURL }) => {
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
  await expect(presentation.getByText('Loading...')).toHaveCount(0, { timeout: 15000 });

  const deck = {
    title: 'End blank deck',
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
        id: 'first',
        type: 'title',
        title: 'First slide',
        style: { backgroundColor: '#111', color: '#fff', height: '100%', width: '100%' },
      },
      {
        id: 'second',
        type: 'title',
        title: 'Second slide',
        style: { backgroundColor: '#222', color: '#fff', height: '100%', width: '100%' },
      },
    ],
  };

  await deckPage.setInputFiles('input#file', {
    name: 'end-blank.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(deck)),
  });
  await deckPage.click('#load');
  await deckPage.waitForSelector('#slides');
  const skip = deckPage.getByRole('button', { name: /skip/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();

  await deckPage.getByTestId('presentation-controls').getByRole('button', { name: 'Start' }).click();
  await expect(presentation.getByText('First slide')).toBeVisible();

  await deckPage.getByTestId('presentation-controls').getByRole('button', { name: 'End' }).click();
  await expect(presentation.getByText('First slide')).toHaveCount(0);
  await expect(presentation.getByText('Second slide')).toHaveCount(0);
  await expect(deckPage.getByTestId('presentation-controls')).toContainText('Blank');

  await deckPage.getByTestId('presentation-controls').getByRole('button', { name: 'Start' }).click();
  await expect(presentation.getByText('First slide')).toBeVisible();

  await context.close();
});
