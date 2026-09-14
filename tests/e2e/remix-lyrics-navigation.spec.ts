import { test, expect } from '@playwright/test';
import { openPresenterSession, sessionSend } from './posterSessionE2E';

/**
 * E2E tests for the lyrics/song navigation workflow.
 * Slide delivery uses the poster session relay (not BroadcastChannel).
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

test.describe('Lyrics navigation workflow', () => {
  test('initial song send shows first two lines', async ({ browser, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    const { context, presenterPage, senderPage, peerId } = await openPresenterSession(browser, base);

    try {
      await sessionSend(senderPage, peerId, {
        slide: SONG_SLIDE,
        message: '',
        useGreenScreen: false,
      });

      await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');
      await expect(presenterPage.locator('#lyrics')).toContainText('Line two here');
      await expect(presenterPage.locator('#lyrics')).not.toContainText('Line three here');
    } finally {
      await context.close();
    }
  });

  test('Next 2 Lines advances to segment 2', async ({ browser, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    const { context, presenterPage, senderPage, peerId } = await openPresenterSession(browser, base);

    try {
      await sessionSend(senderPage, peerId, {
        slide: SONG_SLIDE,
        message: '',
        useGreenScreen: false,
      });
      await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');

      await sessionSend(senderPage, peerId, {
        data: { lyricsNavigation: { command: 'next' } },
      });

      await expect(presenterPage.locator('#lyrics')).toContainText('Line three here');
      await expect(presenterPage.locator('#lyrics')).toContainText('Line four here');
      await expect(presenterPage.locator('#lyrics')).not.toContainText('Line one here');
      await expect(presenterPage.locator('#lyrics')).not.toContainText('Line two here');
    } finally {
      await context.close();
    }
  });

  test('Next 2 Lines twice reaches segment 3', async ({ browser, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    const { context, presenterPage, senderPage, peerId } = await openPresenterSession(browser, base);

    try {
      await sessionSend(senderPage, peerId, {
        slide: SONG_SLIDE,
        message: '',
        useGreenScreen: false,
      });
      await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');

      await sessionSend(senderPage, peerId, {
        data: { lyricsNavigation: { command: 'next' } },
      });
      await expect(presenterPage.locator('#lyrics')).toContainText('Line three here');

      await sessionSend(senderPage, peerId, {
        data: { lyricsNavigation: { command: 'next' } },
      });

      await expect(presenterPage.locator('#lyrics')).toContainText('Line five here');
      await expect(presenterPage.locator('#lyrics')).toContainText('Line six here');
    } finally {
      await context.close();
    }
  });

  test('Prev 2 Lines steps back to previous segment', async ({ browser, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    const { context, presenterPage, senderPage, peerId } = await openPresenterSession(browser, base);

    try {
      await sessionSend(senderPage, peerId, {
        slide: SONG_SLIDE,
        message: '',
        useGreenScreen: false,
      });
      await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');

      await sessionSend(senderPage, peerId, {
        data: { lyricsNavigation: { command: 'next' } },
      });
      await expect(presenterPage.locator('#lyrics')).toContainText('Line three here');

      await sessionSend(senderPage, peerId, {
        data: { lyricsNavigation: { command: 'previous' } },
      });

      await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');
      await expect(presenterPage.locator('#lyrics')).toContainText('Line two here');
      await expect(presenterPage.locator('#lyrics')).not.toContainText('Line three here');
    } finally {
      await context.close();
    }
  });

  test('Prev 2 Lines at segment 0 does not underflow', async ({ browser, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    const { context, presenterPage, senderPage, peerId } = await openPresenterSession(browser, base);

    try {
      await sessionSend(senderPage, peerId, {
        slide: SONG_SLIDE,
        message: '',
        useGreenScreen: false,
      });
      await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');

      await sessionSend(senderPage, peerId, {
        data: { lyricsNavigation: { command: 'previous' } },
      });

      await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');
      await expect(presenterPage.locator('#lyrics')).toContainText('Line two here');
      await expect(presenterPage.locator('#lyrics')).not.toContainText('Line three here');
    } finally {
      await context.close();
    }
  });

  test('new song send resets segment to 0', async ({ browser, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3000';
    const { context, presenterPage, senderPage, peerId } = await openPresenterSession(browser, base);

    try {
      await sessionSend(senderPage, peerId, {
        slide: SONG_SLIDE,
        message: '',
        useGreenScreen: false,
      });
      await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');

      await sessionSend(senderPage, peerId, {
        data: { lyricsNavigation: { command: 'next' } },
      });
      await expect(presenterPage.locator('#lyrics')).toContainText('Line three here');

      await sessionSend(senderPage, peerId, {
        slide: SONG_SLIDE,
        message: '',
        useGreenScreen: false,
      });

      await expect(presenterPage.locator('#lyrics')).toContainText('Line one here');
      await expect(presenterPage.locator('#lyrics')).toContainText('Line two here');
      await expect(presenterPage.locator('#lyrics')).not.toContainText('Line three here');
    } finally {
      await context.close();
    }
  });
});
