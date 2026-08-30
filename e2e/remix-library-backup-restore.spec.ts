import { test, expect } from '@playwright/test';

/**
 * Remix dev E2E: library backup/restore via LibraryPanel on `/` (home).
 *
 * Mirrors `library-backup-restore.spec.ts` but runs under `playwright.remix.config.ts`
 * (baseURL = Remix port, `remix dev`). Uses pathname route predicates so `_data`
 * query params from remixDataUrl() are intercepted like `home-library.spec.ts`.
 */

const SQLITE_MAGIC = Buffer.from('SQLite format 3\0');

/** Wire standard library API mocks so LibraryPanel loads on home. */
async function setupBaseMocks(page: import('@playwright/test').Page) {
  await page.route(
    (url) => url.pathname === '/library/save',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'mock-id' }),
      });
    },
  );

  await page.route(
    (url) => url.pathname.startsWith('/library/open/'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ title: 'Mock Deck', slides: [] }),
      });
    },
  );

  await page.route(
    (url) => url.pathname.startsWith('/library/delete/'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    },
  );

  await page.route(
    (url) => url.pathname === '/library',
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    },
  );
}

test.describe('Library backup and restore (remix dev, home LibraryPanel)', () => {
  test('backup button initiates a .sqlite file download', async ({ page }) => {
    await setupBaseMocks(page);

    await page.route(
      (url) => url.pathname === '/library/backup',
      async (route) => {
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': 'attachment; filename="poster.sqlite"',
          },
          body: SQLITE_MAGIC,
        });
      },
    );

    await page.goto('/');

    await expect(page.locator('[data-testid="library-panel"]')).toBeVisible({ timeout: 8000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="library-backup-btn"]').click(),
    ]);

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.sqlite$/i);
    expect(filename.toLowerCase()).toContain('poster');
  });

  test('restore with a valid .sqlite file shows success status', async ({ page }) => {
    await setupBaseMocks(page);

    await page.route(
      (url) => url.pathname === '/library/restore',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
      },
    );

    await page.goto('/');
    await expect(page.locator('[data-testid="library-panel"]')).toBeVisible({ timeout: 8000 });

    page.on('dialog', (dialog) => dialog.accept());

    await page.locator('[data-testid="library-restore-input"]').setInputFiles({
      name: 'test.sqlite',
      mimeType: 'application/octet-stream',
      buffer: SQLITE_MAGIC,
    });

    await expect(page.locator('[data-testid="restore-status"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="restore-status"]')).toContainText(/restored successfully/i);
  });

  test('restore failure shows error status from server response', async ({ page }) => {
    await setupBaseMocks(page);

    await page.route(
      (url) => url.pathname === '/library/restore',
      async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Disk full' }),
        });
      },
    );

    await page.goto('/');
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

  test('restore dismissed by confirm dialog does not call the endpoint', async ({ page }) => {
    await setupBaseMocks(page);

    let restoreCalled = false;
    await page.route(
      (url) => url.pathname === '/library/restore',
      async (route) => {
        restoreCalled = true;
        await route.continue();
      },
    );

    await page.goto('/');
    await expect(page.locator('[data-testid="library-panel"]')).toBeVisible({ timeout: 8000 });

    page.on('dialog', (dialog) => dialog.dismiss());

    await page.locator('[data-testid="library-restore-input"]').setInputFiles({
      name: 'cancelled.sqlite',
      mimeType: 'application/octet-stream',
      buffer: SQLITE_MAGIC,
    });

    await page.waitForTimeout(1000);

    expect(restoreCalled).toBe(false);
    await expect(page.locator('[data-testid="restore-status"]')).not.toBeVisible();
  });
});
