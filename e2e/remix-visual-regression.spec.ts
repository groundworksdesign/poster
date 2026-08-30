import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for the presenter route.
 *
 * These tests lock the pixel-level layout of broadcast-critical output:
 *   - 9-cell alignment grid (3 vertical x 3 horizontal positions)
 *   - green screen mode (body background becomes chroma-key green #00b140)
 *   - idle/blank state (no slide sent)
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
      // Use 'title' type so the slide frame fills 100% of the viewport; 'general'
      // only fills 72% and the overlay text lands in the transparent page area
      // where it is invisible against the white body background.
      type: 'title',
      title: 'Visual Regression Test',
      subTitle: `${verticalAlign} / ${horizontalAlign}`,
      style: {
        backgroundColor: '#1a1a2e',
        color: '#e0e0e0',
        width: '100%',
        height: '100%',
        fontFamily: 'Arial, sans-serif',
        // Large font ensures the text block covers enough pixels that even a
        // small position shift (e.g. 40px) exceeds the 0.5% diff threshold.
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

async function broadcastSlide(
  page: import('@playwright/test').Page,
  payload: unknown,
) {
  await page.evaluate((msg) => {
    const ch = new BroadcastChannel('presentation');
    ch.postMessage(msg);
    ch.close();
  }, payload);
}

/**
 * Open the presenter in a dedicated page at 1920x1080, and navigate a second
 * page on the same context to the same origin so BroadcastChannel messages are
 * same-origin and reach the presenter listener.
 */
async function openPresenter(browser: import('@playwright/test').Browser, baseURL: string) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: 'dark',
  });
  const presenterPage = await context.newPage();
  const senderPage = await context.newPage();

  // Navigate senderPage to a same-origin route first; on about:blank the
  // BroadcastChannel sits on a different origin and never reaches the presenter.
  await senderPage.goto(`${baseURL}/deck`, { waitUntil: 'domcontentloaded' });
  await presenterPage.goto(`${baseURL}/presentation`, { waitUntil: 'networkidle' });

  return { context, presenterPage, senderPage };
}

// ---------------------------------------------------------------------------
// 9-cell alignment grid
// ---------------------------------------------------------------------------
test.describe('alignment grid -- screenshot', () => {
  for (const { cell, verticalAlign, horizontalAlign } of ALIGN_CELLS) {
    test(`align: ${cell}`, async ({ browser, baseURL }) => {
      const base = baseURL ?? 'http://127.0.0.1:3000';
      const { context, presenterPage, senderPage } = await openPresenter(browser, base);

      try {
        await broadcastSlide(senderPage, buildSlidePayload(verticalAlign, horizontalAlign));

        // Wait for overlay to appear with the correct title text
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

// ---------------------------------------------------------------------------
// Green screen mode
// ---------------------------------------------------------------------------
test.describe('green screen -- screenshot', () => {
  test('body background is chroma-key green', async ({ browser, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3000';
    const { context, presenterPage, senderPage } = await openPresenter(browser, base);

    try {
      const greenPayload = {
        ...buildSlidePayload('middle', 'center'),
        useGreenScreen: true,
      };

      await broadcastSlide(senderPage, greenPayload);

      // Confirm the body background color is applied by the useEffect in Present.tsx
      await presenterPage.waitForFunction(
        () => document.body.style.backgroundColor === 'rgb(0, 177, 64)',
        { timeout: 10000 },
      );

      await expect(presenterPage).toHaveScreenshot('greenscreen.png', {
        fullPage: false,
        animations: 'disabled',
        maxDiffPixelRatio: 0.005,
      });

      // Also assert the exact background color so tests fail fast with a clear message
      const bgColor = await presenterPage.evaluate(
        () => document.body.style.backgroundColor,
      );
      // #00b140 == rgb(0, 177, 64)
      expect(bgColor).toBe('rgb(0, 177, 64)');
    } finally {
      await context.close();
    }
  });
});

// ---------------------------------------------------------------------------
// Idle / blank state (no slide sent)
// ---------------------------------------------------------------------------
test.describe('idle / blank state -- screenshot', () => {
  test('presenter shows blank output before any slide is sent', async ({ browser, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3000';
    const { context, presenterPage } = await openPresenter(browser, base);

    try {
      // No BroadcastChannel message -- presenter should be blank
      await presenterPage.waitForTimeout(500);

      // The slide overlay should not be visible
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
