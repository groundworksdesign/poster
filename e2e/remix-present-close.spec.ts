import { test, expect } from '@playwright/test';
import { openPresenterSession } from './posterSessionE2E';

test('closing a Present window removes it from the deck session list', async ({ browser, baseURL }) => {
  const { context, presenterPage, senderPage, peerId, presentId } = await openPresenterSession(
    browser,
    baseURL || 'http://127.0.0.1:3000',
  );

  try {
    await expect.poll(async () => {
      return senderPage.evaluate(async (id) => {
        const response = await fetch('/api/poster/deck-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ peerId: id, command: { type: 'list' } }),
        });
        return ((await response.json()) as { presents?: string[] }).presents || [];
      }, peerId);
    }).toContain(presentId);

    await presenterPage.close();

    await expect.poll(async () => {
      return senderPage.evaluate(async (id) => {
        const response = await fetch('/api/poster/deck-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ peerId: id, command: { type: 'list' } }),
        });
        return ((await response.json()) as { presents?: string[] }).presents || [];
      }, peerId);
    }).not.toContain(presentId);
  } finally {
    await context.close();
  }
});
