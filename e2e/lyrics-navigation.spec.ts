import { test, expect } from '@playwright/test';

/**
 * E2E tests for the lyrics/song navigation workflow.
 *
 * Uses BroadcastChannel directly (via page.evaluate) to simulate operator sends,
 * mirroring the pattern in playwright-smoke.spec.ts. Both pages share the same
 * browser context so BroadcastChannel messages route between them on the same origin.
 */

const SONG_SLIDE = {
  type: 'song',
  title: 'Test Hymn',
  lyrics: {
    title: 'Test Hymn',
    author: 'Test Author',
    verses: [
      { number: 1, lines: ['Line one here', 'Line two here', 'Line three here', 'Line four here'] },
      { number: 2, lines: ['Line five here', 'Line six here'] },
    ],
  },
  style: {
    backgroundColor: '#000000',
    color: '#ffffff',
    width: '100%',
    height: '100%',
    fontFamily: 'Arial, sans-serif',
    fontSize: '24px',
    horizontalAlign: 'center',
    verticalAlign: 'middle',
  },
};

async function sendToBroadcastChannel(
  page: import('@playwright/test').Page,
  payload: unknown,
) {
  await page.evaluate((msg) => {
    const ch = new BroadcastChannel('presentation');
    ch.postMessage(msg);
    ch.close();
  }, payload);
}

test.describe('Lyrics navigation workflow', () => {
  test('initial song send shows first two lines', async ({ browser, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3001';
    const context = await browser.newContext();
    const presenterPage = await context.newPage();
    const operatorPage = await context.newPage();

    await presenterPage.goto(`${base}/presentation`);
    await operatorPage.goto(`${base}/deck`);

    await sendToBroadcastChannel(operatorPage, {
      slide: SONG_SLIDE,
      message: '',
      useGreenScreen: false,
    });

    // First segment: lines 1 and 2 visible
    await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');
    await expect(presenterPage.locator('#lyrics')).toContainText('Line two here');
    // Third line must NOT be visible yet
    await expect(presenterPage.locator('#lyrics')).not.toContainText('Line three here');

    await context.close();
  });

  test('Next 2 Lines advances to segment 2', async ({ browser, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3001';
    const context = await browser.newContext();
    const presenterPage = await context.newPage();
    const operatorPage = await context.newPage();

    await presenterPage.goto(`${base}/presentation`);
    await operatorPage.goto(`${base}/deck`);

    // Send initial song slide
    await sendToBroadcastChannel(operatorPage, {
      slide: SONG_SLIDE,
      message: '',
      useGreenScreen: false,
    });
    await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');

    // Navigate forward one segment
    await sendToBroadcastChannel(operatorPage, {
      data: { lyricsNavigation: { command: 'next' } },
    });

    await expect(presenterPage.locator('#lyrics')).toContainText('Line three here');
    await expect(presenterPage.locator('#lyrics')).toContainText('Line four here');
    await expect(presenterPage.locator('#lyrics')).not.toContainText('Line one here');
    await expect(presenterPage.locator('#lyrics')).not.toContainText('Line two here');

    await context.close();
  });

  test('Next 2 Lines twice reaches segment 3', async ({ browser, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3001';
    const context = await browser.newContext();
    const presenterPage = await context.newPage();
    const operatorPage = await context.newPage();

    await presenterPage.goto(`${base}/presentation`);
    await operatorPage.goto(`${base}/deck`);

    await sendToBroadcastChannel(operatorPage, {
      slide: SONG_SLIDE,
      message: '',
      useGreenScreen: false,
    });
    await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');

    await sendToBroadcastChannel(operatorPage, {
      data: { lyricsNavigation: { command: 'next' } },
    });
    await expect(presenterPage.locator('#lyrics')).toContainText('Line three here');

    await sendToBroadcastChannel(operatorPage, {
      data: { lyricsNavigation: { command: 'next' } },
    });

    await expect(presenterPage.locator('#lyrics')).toContainText('Line five here');
    await expect(presenterPage.locator('#lyrics')).toContainText('Line six here');

    await context.close();
  });

  test('Prev 2 Lines steps back to previous segment', async ({ browser, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3001';
    const context = await browser.newContext();
    const presenterPage = await context.newPage();
    const operatorPage = await context.newPage();

    await presenterPage.goto(`${base}/presentation`);
    await operatorPage.goto(`${base}/deck`);

    await sendToBroadcastChannel(operatorPage, {
      slide: SONG_SLIDE,
      message: '',
      useGreenScreen: false,
    });
    await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');

    // Advance to segment 2
    await sendToBroadcastChannel(operatorPage, {
      data: { lyricsNavigation: { command: 'next' } },
    });
    await expect(presenterPage.locator('#lyrics')).toContainText('Line three here');

    // Step back to segment 1
    await sendToBroadcastChannel(operatorPage, {
      data: { lyricsNavigation: { command: 'previous' } },
    });

    await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');
    await expect(presenterPage.locator('#lyrics')).toContainText('Line two here');
    await expect(presenterPage.locator('#lyrics')).not.toContainText('Line three here');

    await context.close();
  });

  test('Prev 2 Lines at segment 0 does not underflow', async ({ browser, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3001';
    const context = await browser.newContext();
    const presenterPage = await context.newPage();
    const operatorPage = await context.newPage();

    await presenterPage.goto(`${base}/presentation`);
    await operatorPage.goto(`${base}/deck`);

    await sendToBroadcastChannel(operatorPage, {
      slide: SONG_SLIDE,
      message: '',
      useGreenScreen: false,
    });
    await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');

    // Attempt to go back from segment 0 -- should stay on lines 1 and 2
    await sendToBroadcastChannel(operatorPage, {
      data: { lyricsNavigation: { command: 'previous' } },
    });

    await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');
    await expect(presenterPage.locator('#lyrics')).toContainText('Line two here');
    await expect(presenterPage.locator('#lyrics')).not.toContainText('Line three here');

    await context.close();
  });

  test('new song send resets segment to 0', async ({ browser, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3001';
    const context = await browser.newContext();
    const presenterPage = await context.newPage();
    const operatorPage = await context.newPage();

    await presenterPage.goto(`${base}/presentation`);
    await operatorPage.goto(`${base}/deck`);

    await sendToBroadcastChannel(operatorPage, {
      slide: SONG_SLIDE,
      message: '',
      useGreenScreen: false,
    });
    await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');

    // Advance to segment 2
    await sendToBroadcastChannel(operatorPage, {
      data: { lyricsNavigation: { command: 'next' } },
    });
    await expect(presenterPage.locator('#lyrics')).toContainText('Line three here');

    // Re-send the same song slide -- should reset to segment 0
    await sendToBroadcastChannel(operatorPage, {
      slide: SONG_SLIDE,
      message: '',
      useGreenScreen: false,
    });

    await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');
    await expect(presenterPage.locator('#lyrics')).toContainText('Line two here');
    await expect(presenterPage.locator('#lyrics')).not.toContainText('Line three here');

    await context.close();
  });
});
