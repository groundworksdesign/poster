import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

export type PosterSessionHandles = {
  context: BrowserContext;
  presenterPage: Page;
  senderPage: Page;
  peerId: string;
  sessionId: string;
  presentId: string;
};

/**
 * Register a deck session, spawn a Present, open Present with session query params,
 * then allow sends via poster:deck-command HTTP relay (no BroadcastChannel).
 */
export async function openPresenterSession(
  browser: Browser,
  baseURL: string,
  options: { viewport?: { width: number; height: number }; colorScheme?: 'dark' | 'light' } = {},
): Promise<PosterSessionHandles> {
  const context = await browser.newContext({
    viewport: options.viewport,
    colorScheme: options.colorScheme,
  });
  const presenterPage = await context.newPage();
  const senderPage = await context.newPage();

  await senderPage.goto(`${baseURL}/deck`, { waitUntil: 'domcontentloaded' });

  const session = await senderPage.evaluate(async () => {
    const peerId = crypto.randomUUID();
    const regRes = await fetch('/api/poster/deck-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, command: { type: 'register' } }),
    });
    const reg = await regRes.json();
    const spawnRes = await fetch('/api/poster/deck-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, command: { type: 'spawn' } }),
    });
    const spawn = await spawnRes.json();
    return {
      peerId,
      sessionId: reg.sessionId as string,
      presentId: spawn.presentId as string,
    };
  });

  await presenterPage.goto(
    `${baseURL}/presentation?sessionId=${encodeURIComponent(session.sessionId)}&presentId=${encodeURIComponent(session.presentId)}`,
    { waitUntil: 'domcontentloaded' },
  );

  await expect(presenterPage.getByText('Loading...')).toHaveCount(0, { timeout: 15000 });
  await expect(
    presenterPage.getByText(/Open Present from the deck builder|Could not connect/),
  ).toHaveCount(0);

  return {
    context,
    presenterPage,
    senderPage,
    peerId: session.peerId,
    sessionId: session.sessionId,
    presentId: session.presentId,
  };
}

export async function sessionSend(
  senderPage: Page,
  peerId: string,
  payload: unknown,
  target: string | 'all' = 'all',
): Promise<void> {
  await senderPage.evaluate(
    async ({ peerId: id, payload: msg, target: t }) => {
      await fetch('/api/poster/deck-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peerId: id,
          command: { type: 'send', payload: msg, target: t },
        }),
      });
    },
    { peerId, payload, target },
  );
}
