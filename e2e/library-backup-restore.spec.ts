import { test, expect } from '@playwright/test';

/**
 * E2E tests for the SQLite library backup and restore workflow.
 *
 * The backup endpoint (/library/backup) and restore endpoint (/library/restore)
 * are Remix route handlers not served by the CRA dev server. page.route()
 * intercepts and mocks those calls so the full UI flow can be exercised
 * without a running Remix server with a real SQLite file.
 *
 * Traceability: ralph/epic.md "Local library (SQLite)" -> backup/restore workflow (task 18).
 */

// Minimal SQLite magic header bytes (first 16 bytes of a valid SQLite3 file).
const SQLITE_MAGIC = Buffer.from('SQLite format 3\0');

/** Wire all standard library API mocks needed to open the panel cleanly. */
async function setupBaseMocks(page: import('@playwright/test').Page) {
  await page.route('**/library/save', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'mock-id' }) });
  });
  await page.route('**/library/open/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ title: 'Mock Deck', slides: [] }) });
  });
  await page.route('**/library/delete/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.route('**/library', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    } else {
      await route.continue();
    }
  });
}

test.describe('Library backup and restore', () => {
  test('backup button initiates a .sqlite file download', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';

    await setupBaseMocks(page);

    // Mock the backup endpoint to return a binary SQLite payload with
    // Content-Disposition: attachment so the browser treats it as a download.
    await page.route('**/library/backup', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="poster.sqlite"',
        },
        body: SQLITE_MAGIC,
      });
    });

    await page.goto(`${base}/deck`);
    await page.locator('#toggle-library').click();
    await expect(page.locator('[data-testid="library-panel"]')).toBeVisible({ timeout: 8000 });

    // Wait for the download event before clicking the anchor.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="library-backup-btn"]').click(),
    ]);

    // The suggested filename must end in .sqlite and reference "poster".
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.sqlite$/i);
    expect(filename.toLowerCase()).toContain('poster');
  });

  test('restore with a valid .sqlite file shows success status', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';

    await setupBaseMocks(page);

    await page.route('**/library/restore', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await page.goto(`${base}/deck`);
    await page.locator('#toggle-library').click();
    await expect(page.locator('[data-testid="library-panel"]')).toBeVisible({ timeout: 8000 });

    // Accept the confirmation dialog that handleRestore() shows before calling the endpoint.
    page.on('dialog', (dialog) => dialog.accept());

    // Playwright can set files on hidden inputs directly.
    await page.locator('[data-testid="library-restore-input"]').setInputFiles({
      name: 'test.sqlite',
      mimeType: 'application/octet-stream',
      buffer: SQLITE_MAGIC,
    });

    await expect(page.locator('[data-testid="restore-status"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="restore-status"]')).toContainText(/restored successfully/i);
  });

  test('restore failure shows error status from server response', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';

    await setupBaseMocks(page);

    await page.route('**/library/restore', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Disk full' }),
      });
    });

    await page.goto(`${base}/deck`);
    await page.locator('#toggle-library').click();
    await expect(page.locator('[data-testid="library-panel"]')).toBeVisible({ timeout: 8000 });

    page.on('dialog', (dialog) => dialog.accept());

    await page.locator('[data-testid="library-restore-input"]').setInputFiles({
      name: 'bad.sqlite',
      mimeType: 'application/octet-stream',
      buffer: SQLITE_MAGIC,
    });

    await expect(page.locator('[data-testid="restore-status"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="restore-status"]')).toContainText(/Disk full/i);
    await expect(page.locator('[data-testid="restore-status"]')).not.toContainText(/restored successfully/i);
  });

  test('restore dismissed by confirm dialog does not call the endpoint', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';

    await setupBaseMocks(page);

    let restoreCalled = false;
    await page.route('**/library/restore', async (route) => {
      restoreCalled = true;
      await route.continue();
    });

    await page.goto(`${base}/deck`);
    await page.locator('#toggle-library').click();
    await expect(page.locator('[data-testid="library-panel"]')).toBeVisible({ timeout: 8000 });

    // Dismiss the confirmation dialog so the fetch is never called.
    page.on('dialog', (dialog) => dialog.dismiss());

    await page.locator('[data-testid="library-restore-input"]').setInputFiles({
      name: 'cancelled.sqlite',
      mimeType: 'application/octet-stream',
      buffer: SQLITE_MAGIC,
    });

    // Short wait to allow any async code to run if the guard failed.
    await page.waitForTimeout(1000);

    expect(restoreCalled).toBe(false);
    await expect(page.locator('[data-testid="restore-status"]')).not.toBeVisible();
  });
});
