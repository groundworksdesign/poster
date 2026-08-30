import { test, expect } from '@playwright/test';

/**
 * E2E tests for the 3x3 alignment grid (design principle 7).
 *
 * Sends a general slide with each of the 9 vertical x horizontal alignment
 * combinations and asserts that the slide-overlay element has the correct
 * inline CSS properties in the presenter view.
 *
 * Alignment mapping in getTitleOverlayStyle() (Present.tsx):
 *   horizontalAlign -> alignItems
 *     left   -> flex-start
 *     center -> center
 *     right  -> flex-end
 *   verticalAlign -> positioning
 *     top    -> top: 20px
 *     middle -> top: 50%  (+ transform: translateY(-50%))
 *     bottom -> bottom: 20px
 */

type AlignCase = {
  cell: string;
  verticalAlign: string;
  horizontalAlign: string;
  expectedAlignItems: string;
  expectedTop: string;
  expectedBottom: string;
};

const ALIGN_CASES: AlignCase[] = [
  { cell: 'upper-left',    verticalAlign: 'top',    horizontalAlign: 'left',   expectedAlignItems: 'flex-start', expectedTop: '20px', expectedBottom: '' },
  { cell: 'upper-middle',  verticalAlign: 'top',    horizontalAlign: 'center', expectedAlignItems: 'center',     expectedTop: '20px', expectedBottom: '' },
  { cell: 'upper-right',   verticalAlign: 'top',    horizontalAlign: 'right',  expectedAlignItems: 'flex-end',   expectedTop: '20px', expectedBottom: '' },
  { cell: 'center-left',   verticalAlign: 'middle', horizontalAlign: 'left',   expectedAlignItems: 'flex-start', expectedTop: '50%',  expectedBottom: '' },
  { cell: 'center-middle', verticalAlign: 'middle', horizontalAlign: 'center', expectedAlignItems: 'center',     expectedTop: '50%',  expectedBottom: '' },
  { cell: 'center-right',  verticalAlign: 'middle', horizontalAlign: 'right',  expectedAlignItems: 'flex-end',   expectedTop: '50%',  expectedBottom: '' },
  { cell: 'bottom-left',   verticalAlign: 'bottom', horizontalAlign: 'left',   expectedAlignItems: 'flex-start', expectedTop: '',     expectedBottom: '20px' },
  { cell: 'bottom-middle', verticalAlign: 'bottom', horizontalAlign: 'center', expectedAlignItems: 'center',     expectedTop: '',     expectedBottom: '20px' },
  { cell: 'bottom-right',  verticalAlign: 'bottom', horizontalAlign: 'right',  expectedAlignItems: 'flex-end',   expectedTop: '',     expectedBottom: '20px' },
];

function buildSlide(verticalAlign: string, horizontalAlign: string) {
  return {
    slide: {
      type: 'general',
      title: `Alignment Test ${verticalAlign}-${horizontalAlign}`,
      style: {
        backgroundColor: '#000000',
        color: '#ffffff',
        width: '100%',
        height: '100%',
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        verticalAlign,
        horizontalAlign,
      },
    },
    message: '',
    useGreenScreen: false,
  };
}

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

test.describe('3x3 alignment grid', () => {
  for (const alignCase of ALIGN_CASES) {
    const { cell, verticalAlign, horizontalAlign, expectedAlignItems, expectedTop, expectedBottom } = alignCase;

    test(`renders ${cell} alignment`, async ({ browser, baseURL }) => {
      const base = baseURL || 'http://127.0.0.1:3001';
      const context = await browser.newContext();
      const presenterPage = await context.newPage();
      const operatorPage = await context.newPage();

      await presenterPage.goto(`${base}/presentation`);
      await operatorPage.goto(`${base}/deck`);

      await sendToBroadcastChannel(operatorPage, buildSlide(verticalAlign, horizontalAlign));

      const overlay = presenterPage.locator('[data-testid="slide-overlay"]');
      await expect(overlay).toBeVisible();

      const styles = await overlay.evaluate((el: HTMLElement) => ({
        alignItems: el.style.alignItems,
        top: el.style.top,
        bottom: el.style.bottom,
      }));

      expect(styles.alignItems, `horizontal (${horizontalAlign}) -> alignItems`).toBe(expectedAlignItems);
      expect(styles.top, `vertical (${verticalAlign}) -> top`).toBe(expectedTop);
      expect(styles.bottom, `vertical (${verticalAlign}) -> bottom`).toBe(expectedBottom);

      await context.close();
    });
  }
});
