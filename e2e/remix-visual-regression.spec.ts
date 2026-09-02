import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for the presenter route.
 *
 * Slide delivery uses the poster session relay (not BroadcastChannel).
 *
 * Baselines are committed to e2e/remix-visual-regression.spec.ts-snapshots/.
 * To regenerate all baselines after an intentional layout change, run:
 *   pnpm test:e2e:remix --update-snapshots
 *
 * All tests use a fixed 1920x1080 viewport for stable 16:9 broadcast output.
 */

const VIEWPORT = { width: 1920, height: 1080 };

type AlignCell = {
  cell: string;
  verticalAlign: 'top' | 'middle' | 'bottom';
  horizontalAlign: 'left' | 'center' | 'right';
};

const ALIGN_CELLS: AlignCell[] = [
  { cell: 'top-left',     verticalAlign: 'top',    horizontalAlign: 'left'   },
  { cell: 'top-center',   verticalAlign: 'top',    horizontalAlign: 'center' },
  { cell: 'top-right',    verticalAlign: 'top',    horizontalAlign: 'right'  },
  { cell: 'mid-left',     verticalAlign: 'middle', horizontalAlign: 'left'   },
  { cell: 'mid-center',   verticalAlign: 'middle', horizontalAlign: 'center' },
  { cell: 'mid-right',    verticalAlign: 'middle', horizontalAlign: 'right'  },
  { cell: 'bot-left',     verticalAlign: 'bottom', horizontalAlign: 'left'   },
  { cell: 'bot-center',   verticalAlign: 'bottom', horizontalAlign: 'center' },
  { cell: 'bot-right',    verticalAlign: 'bottom', horizontalAlign: 'right'  },
];

function buildSlidePayload(
  verticalAlign: string,
  horizontalAlign: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    slide: {
      type: 'title',
      title: 'Visual Regression Test',
      subTitle: `${verticalAlign} / ${horizontalAlign}`,
      style: {
        backgroundColor: '#1a1a2e',
        color: '#e0e0e0',
        width: '100%',
        height: '100%',
        fontFamily: 'Arial, sans-serif',
        fontSize: '120px',
        verticalAlign,
        horizontalAlign,
      },
      ...overrides,
    },
    message: '',
    useGreenScreen: false,
  };
}

type SessionHandles = {
  context: import('@playwright/test').BrowserContext;
  presenterPage: import('@playwright/test').Page;
  senderPage: import('@playwright/test').Page;
  peerId: string;
  presentId: string;
};

/**
 * Register a deck session, spawn a Present, open Present with session query params,
 * then send via poster:deck-command HTTP relay (no BroadcastChannel).
 */
async function openPresenterSession(
  browser: import('@playwright/test').Browser,
  baseURL: string,
): Promise<SessionHandles> {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: 'dark',
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

  // Wait until Present has registered and left the loading / error state
  await expect(presenterPage.getByText('Loading...')).toHaveCount(0, { timeout: 15000 });
  await expect(
    presenterPage.getByText(/Open Present from the deck builder|Could not connect/),
  ).toHaveCount(0);

  return {
    context,
    presenterPage,
    senderPage,
    peerId: session.peerId,
    presentId: session.presentId,
  };
}

async function sessionSend(
  senderPage: import('@playwright/test').Page,
  peerId: string,
  payload: unknown,
  target: string | 'all' = 'all',
) {
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

test.describe('alignment grid -- screenshot', () => {
  for (const { cell, verticalAlign, horizontalAlign } of ALIGN_CELLS) {
    test(`align: ${cell}`, async ({ browser, baseURL }) => {
      const base = baseURL ?? 'http://127.0.0.1:3000';
      const { context, presenterPage, senderPage, peerId } = await openPresenterSession(
        browser,
        base,
      );

      try {
        await sessionSend(senderPage, peerId, buildSlidePayload(verticalAlign, horizontalAlign));

        const overlay = presenterPage.locator('[data-testid="slide-overlay"]').first();
        await expect(overlay).toBeVisible({ timeout: 10000 });

        await expect(presenterPage).toHaveScreenshot(`align-${cell}.png`, {
          fullPage: false,
          animations: 'disabled',
          maxDiffPixelRatio: 0.005,
        });
      } finally {
        await context.close();
      }
    });
  }
});

test.describe('green screen -- screenshot', () => {
  test('body background is chroma-key green', async ({ browser, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3000';
    const { context, presenterPage, senderPage, peerId } = await openPresenterSession(
      browser,
      base,
    );

    try {
      const greenPayload = {
        ...buildSlidePayload('middle', 'center'),
        useGreenScreen: true,
      };

      await sessionSend(senderPage, peerId, greenPayload);

      await presenterPage.waitForFunction(
        () => document.body.style.backgroundColor === 'rgb(0, 177, 64)',
        { timeout: 10000 },
      );

      await expect(presenterPage).toHaveScreenshot('greenscreen.png', {
        fullPage: false,
        animations: 'disabled',
        maxDiffPixelRatio: 0.005,
      });

      const bgColor = await presenterPage.evaluate(
        () => document.body.style.backgroundColor,
      );
      expect(bgColor).toBe('rgb(0, 177, 64)');
    } finally {
      await context.close();
    }
  });
});

test.describe('idle / blank state -- screenshot', () => {
  test('presenter shows blank output before any slide is sent', async ({ browser, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3000';
    const { context, presenterPage } = await openPresenterSession(browser, base);

    try {
      await presenterPage.waitForTimeout(500);

      const overlay = presenterPage.locator('[data-testid="slide-overlay"]').first();
      await expect(overlay).not.toBeVisible();

      await expect(presenterPage).toHaveScreenshot('blank.png', {
        fullPage: false,
        animations: 'disabled',
        maxDiffPixelRatio: 0.005,
      });
    } finally {
      await context.close();
    }
  });
});
