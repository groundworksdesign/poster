import { test, expect } from '@playwright/test';

/**
 * Diagnoses "blank window" / no controls:
 * - CRA dev server injects JS into index.html; raw public/index.html has no bundles → #root stays empty.
 * - If webServer uses `node server/index.js` without a built bundle served from build/, same problem for /.
 */
test.describe('Blank page diagnostics', () => {
  test('page should load React bundle (script tags + #root has content)', async ({ page }) => {
    const consoleMessages: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    await page.goto('/deck');

    const scriptSrcs = await page.$$eval('script[src]', els => els.map(s => (s as HTMLScriptElement).src));
    const rootHtml = await page.locator('#root').innerHTML();
    const bodyText = await page.locator('body').innerText();

    // Attach as test info for CI logs
    await test.info().attach('script-tags', {
      body: JSON.stringify(scriptSrcs, null, 2),
      contentType: 'application/json',
    });
    await test.info().attach('console-snapshot', {
      body: consoleMessages.slice(0, 30).join('\n') || '(none)',
      contentType: 'text/plain',
    });
    if (pageErrors.length) {
      await test.info().attach('page-errors', {
        body: pageErrors.join('\n'),
        contentType: 'text/plain',
      });
    }

    expect(
      scriptSrcs.length,
      `Expected at least one <script src> from CRA/webpack. Got ${scriptSrcs.length}. ` +
        `If zero, the server is likely serving raw public/index.html (no bundle) — use react-scripts start or serve the CRA build output.`,
    ).toBeGreaterThan(0);

    expect(rootHtml.trim().length, '#root should not be empty after React mounts').toBeGreaterThan(0);
    expect(bodyText, 'Deck UI should include heading or nav text').toMatch(/Deck|Load|Save/i);
  });
});
