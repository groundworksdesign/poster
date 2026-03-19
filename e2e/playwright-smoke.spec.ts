import { test, expect } from '@playwright/test';

test('sending slide from deck updates presentation', async ({ browser, baseURL }) => {
  // Use a single context so BroadcastChannel messages are routed between pages
  const context = await browser.newContext();
  const pagePresentation = await context.newPage();
  const pageDeck = await context.newPage();

  const base = baseURL || 'http://localhost:3000';
  await pagePresentation.goto(`${base}/presentation`);
  await pageDeck.goto(`${base}/deck`);

  // Post a PresentData-like message from deck page
  await pageDeck.evaluate(() => {
    const channel = new BroadcastChannel('presentation');
    const message = {
      slide: {
        type: 'GENERAL',
        title: 'Smoke Test Slide',
        style: {
          backgroundColor: '#000000',
          color: '#ffffff',
          width: '100%',
          height: '150px',
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px'
        }
      },
      message: 'Smoke test message',
      useGreenScreen: false
    };
    channel.postMessage(message);
    channel.close();
  });

  // Wait for presentation to update
  await pagePresentation.locator('#message').waitFor({ timeout: 5000 });
  const msg = await pagePresentation.locator('#message').textContent();
  expect(msg).toContain('Smoke test message');

  await pagePresentation.locator('#content').waitFor({ timeout: 5000 });
  const contentText = await pagePresentation.locator('#content').textContent();
  expect(contentText).toContain('Smoke Test Slide');
});
