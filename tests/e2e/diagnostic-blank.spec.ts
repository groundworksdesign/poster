import { test } from '@playwright/test';

/**
 * Diagnostic: why the window shows no controls.
 * Run: npx playwright test tests/e2e/diagnostic-blank.spec.ts
 */

test.describe('blank window diagnostic', () => {
  test('log HTML, scripts, and console for / /deck /presentation', async ({
    page,
  }) => {
    const lines: string[] = [];
    const log = (s: string) => {
      lines.push(s);
      // eslint-disable-next-line no-console
      console.log(`[diagnostic] ${s}`);
    };

    page.on('console', msg =>
      log(`console.${msg.type()}: ${msg.text()}`),
    );
    page.on('pageerror', err => log(`pageerror: ${err.message}`));
    page.on('requestfailed', req =>
      log(`requestfailed: ${req.url()} ${req.failure()?.errorText}`),
    );

    for (const path of ['/', '/deck', '/presentation'] as const) {
      log(`\n========== ${path} ==========`);
      const res = await page.goto(path, { waitUntil: 'networkidle' });
      log(`status: ${res?.status()}`);
      const scriptCount = await page.locator('script[src]').count();
      const inlineScripts = await page.locator('script:not([src])').count();
      log(`script[src] count: ${scriptCount}`);
      log(`inline script count: ${inlineScripts}`);
      const root = page.locator('#root');
      const hasRoot = await root.count();
      log(`#root present: ${hasRoot}`);
      if (hasRoot) {
        log(`#root innerHTML length: ${(await root.innerHTML()).length}`);
      }
      const bodyText = (await page.locator('body').innerText()).slice(0, 500);
      log(`body text (first 500 chars): ${JSON.stringify(bodyText)}`);
      const title = await page.title();
      log(`document.title: ${JSON.stringify(title)}`);
    }

    // Summary: if script[src] is 0 on /, Express likely served public/index.html (CRA template) with no JS.
    await page.goto('/');
    const scriptSrcCount = await page.locator('script[src]').count();
    log(`\nSUMMARY for /: script[src]=${scriptSrcCount} — if 0, static middleware served unbundled HTML.`);
    test.info().attach('diagnostic-log', {
      body: lines.join('\n'),
      contentType: 'text/plain',
    });
  });
});
