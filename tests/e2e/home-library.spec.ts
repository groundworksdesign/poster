import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * E2E tests for the home-page LibraryPanel integration added in epic-002.
 *
 * Covers:
 *   - LibraryPanel renders on the home page and lists entries.
 *   - Clicking Open navigates to /deck?open=<id> (window.location.assign).
 *   - "Import a file" CTA link targets /deck?focusImport=1.
 *   - Deleting an entry from home removes it from the list.
 *   - /deck does NOT render a full duplicate LibraryPanel.
 *
 * All library API calls are intercepted with page.route() mocks; no live
 * Remix server or SQLite database is required.
 *
 * Traceability: ralph/epic.md epic-002 todo "home-library" ->
 *   Mount LibraryPanel on HomePage; DeckBuilder ?open= + ?focusImport=;
 *   trim duplicate deck library toggle; update unit/e2e tests.
 */

const SAMPLE_DECK_PATH = path.join(__dirname, '..', '..', 'public', 'sample-slide-deck.json');
const SAMPLE_DECK = JSON.parse(fs.readFileSync(SAMPLE_DECK_PATH, 'utf-8'));

const MOCK_ENTRY = {
  id: 'home-lib-001',
  title: 'Sunday Morning Service',
  date: '2026-05-11',
  location: 'Sanctuary',
  created_at: '2026-05-11T08:00:00.000Z',
};

/**
 * Wire all library API mocks used by home-page tests.
 *
 * Uses URL predicate functions rather than glob strings so that the
 * `?_data=<routeId>` query parameter appended by remixDataUrl() does not
 * prevent the route from being intercepted.
 *
 * @param entries  What GET /library returns.  Defaults to [MOCK_ENTRY].
 */
async function setupLibraryMocks(
  page: import('@playwright/test').Page,
  entries: typeof MOCK_ENTRY[] = [MOCK_ENTRY],
) {
  // POST /library/save[?_data=...]
  await page.route(
    (url) => url.pathname === '/library/save',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: MOCK_ENTRY.id }),
      });
    },
  );

  // GET /library/open/<id>[?_data=...]
  await page.route(
    (url) => url.pathname.startsWith('/library/open/'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SAMPLE_DECK),
      });
    },
  );

  // DELETE /library/delete/<id>[?_data=...]
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

  // GET /library[?_data=...] — list endpoint; must be registered last so the
  // more-specific /library/save, /library/open/, /library/delete/ matchers
  // above take priority.
  await page.route(
    (url) => url.pathname === '/library',
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(entries),
        });
      } else {
        await route.continue();
      }
    },
  );
}

test.describe('Home-page LibraryPanel integration', () => {
  test('library panel is visible on home page and shows saved entries', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3000';

    await setupLibraryMocks(page);
    await page.goto(`${base}/`);

    const panel = page.locator('[data-testid="library-panel"]');
    await expect(panel).toBeVisible({ timeout: 8000 });

    const entries = panel.locator('[data-testid="library-entry"]');
    await expect(entries).toHaveCount(1, { timeout: 8000 });
    await expect(entries.first()).toContainText(MOCK_ENTRY.title);
  });

  test('clicking Open on home opens /deck?open=<id> in a new tab', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3000';

    await setupLibraryMocks(page);
    await page.goto(`${base}/`);

    await expect(page.locator('[data-testid="library-panel"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="library-entry"]')).toHaveCount(1, { timeout: 8000 });

    const [deckPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.locator('[data-testid="library-open-btn"]').first().click(),
    ]);

    await deckPage.waitForURL(/\/deck\?open=/, { timeout: 10000 });
    const deckUrl = deckPage.url();
    expect(deckUrl).toContain('/deck');
    expect(deckUrl).toContain('open=');
    expect(decodeURIComponent(deckUrl)).toContain(MOCK_ENTRY.id);

    expect(page.url()).not.toContain('/deck');
    await deckPage.close();
  });

  test('"Import a file" CTA link targets /deck?focusImport=1', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3000';

    await setupLibraryMocks(page);
    await page.goto(`${base}/`);

    // The link has target="_blank" so we intercept new page instead of navigating.
    // Check the href attribute directly -- simpler and avoids popup handling.
    const importLink = page.getByRole('link', { name: /import a file/i });
    await expect(importLink).toBeVisible({ timeout: 8000 });

    const href = await importLink.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toContain('/deck');
    expect(href).toContain('focusImport=1');
  });

  test('home page shows empty state when no library entries exist', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3000';

    await setupLibraryMocks(page, []);
    await page.goto(`${base}/`);

    const panel = page.locator('[data-testid="library-panel"]');
    await expect(panel).toBeVisible({ timeout: 8000 });

    await expect(page.locator('[data-testid="library-empty"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="library-entry"]')).toHaveCount(0);
  });

  test('deleting an entry from home removes it from the list', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3000';

    // Both GET and DELETE mocks are registered on the browser context so they
    // intercept requests regardless of whether they originate from the page or
    // from the service worker (which takes control after the initial load).
    let hasDeleted = false;
    await page.context().route(
      (url) => url.pathname === '/library',
      async (route) => {
        if (route.request().method() !== 'GET') { await route.continue(); return; }
        const body = hasDeleted ? [] : [MOCK_ENTRY];
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      },
    );
    await page.context().route(
      (url) => url.pathname.startsWith('/library/delete/'),
      async (route) => {
        hasDeleted = true;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      },
    );

    await page.goto(`${base}/`);
    await expect(page.locator('[data-testid="library-panel"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="library-entry"]')).toHaveCount(1, { timeout: 8000 });

    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('[data-testid="library-delete-btn"]').first().click();

    // After delete + re-fetch the empty state should appear.
    await expect(page.locator('[data-testid="library-empty"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="library-entry"]')).toHaveCount(0);
  });

  test('/deck page does not render a full duplicate LibraryPanel', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3000';

    // Mock library so no stray requests fail
    await setupLibraryMocks(page);
    await page.goto(`${base}/deck`);

    // The Save to Library button should be present (expected workflow)
    await expect(page.locator('#save-to-library')).toBeVisible({ timeout: 8000 });

    // But a full LibraryPanel (with its data-testid) must NOT be rendered on /deck
    // Task 27 removed the showLibrary toggle; this guards against regression.
    const libraryPanel = page.locator('[data-testid="library-panel"]');
    await expect(libraryPanel).toHaveCount(0);
  });
});
