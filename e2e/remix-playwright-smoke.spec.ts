import { test, expect } from '@playwright/test';
import { openPresenterSession, sessionSend } from './posterSessionE2E';

test('sending slide via session relay updates presentation', async ({ browser, baseURL }) => {
  const base = baseURL || 'http://127.0.0.1:3000';
  const { context, presenterPage, senderPage, peerId } = await openPresenterSession(browser, base);

  try {
    await sessionSend(senderPage, peerId, {
      slide: {
        type: 'GENERAL',
        title: 'Smoke Test Slide',
        style: {
          backgroundColor: '#000000',
          color: '#ffffff',
          width: '100%',
          height: '150px',
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
        },
      },
      message: 'Smoke test message',
      useGreenScreen: false,
    });

    await presenterPage.locator('#message').waitFor({ timeout: 5000 });
    const msg = await presenterPage.locator('#message').textContent();
    expect(msg).toContain('Smoke test message');

    await presenterPage.locator('#content').waitFor({ timeout: 5000 });
    const contentText = await presenterPage.locator('#content').textContent();
    expect(contentText).toContain('Smoke Test Slide');
  } finally {
    await context.close();
  }
});
