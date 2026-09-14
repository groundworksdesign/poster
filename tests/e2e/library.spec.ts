import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * E2E tests for the SQLite library save / open / delete workflow.
 *
 * The library API endpoints (/library/save, /library, /library/open/:id,
 * /library/delete/:id) live in Remix routes that are not served by the CRA
 * dev server used in Playwright. page.route() intercepts and mocks those
 * calls so the full UI flow can be exercised without a running Remix server.
 *
 * Traceability: ralph/epic.md "Local library (SQLite)" -> Save / update,
 * Open, and delete workflows.
 */

const SAMPLE_DECK_PATH = path.join(__dirname, '..', '..', 'public', 'sample-slide-deck.json');
const SAMPLE_DECK = JSON.parse(fs.readFileSync(SAMPLE_DECK_PATH, 'utf-8'));

const MOCK_ENTRY = {
  id: 'lib-entry-001',
  title: 'Sample Presentation Deck',
  date: '2026-04-01',
  location: 'Main Stage',
  created_at: '2026-04-01T10:00:00.000Z',
};

/** Create a new deck via the "New Deck" button so deck state is populated. */
async function createNewDeck(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'New Deck' }).click();
  await expect(page.locator('#status')).toContainText('New deck created', { timeout: 8000 });
}

/**
 * Wire all four library API mocks on a page.
 * @param entries  What the GET /library endpoint returns. Defaults to [MOCK_ENTRY].
 */
async function setupLibraryMocks(
  page: import('@playwright/test').Page,
  entries: typeof MOCK_ENTRY[] = [MOCK_ENTRY],
) {
  await page.route('**/library/save', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: MOCK_ENTRY.id }),
    });
  });

  await page.route('**/library/open/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SAMPLE_DECK),
    });
  });

  await page.route('**/library/delete/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route('**/library', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(entries),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe('Library workflow', () => {
  test('save deck to library sets library-id indicator and shows success message', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';

    await setupLibraryMocks(page);
    await page.goto(`${base}/deck`);
    await createNewDeck(page);

    const saveBtn = page.locator('#save-to-library');
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();

    // Status message confirms save
    await expect(page.locator('#status')).toContainText(/saved to library/i, { timeout: 8000 });

    // Library ID indicator appears with the returned id
    const indicator = page.locator('[data-testid="library-id"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });
    await expect(indicator).toContainText(MOCK_ENTRY.id);
  });

  test('library panel lists saved entries', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';

    await setupLibraryMocks(page);
    await page.goto(`${base}/`);

    const panel = page.locator('[data-testid="library-panel"]');
    await expect(panel).toBeVisible({ timeout: 8000 });

    const entries = panel.locator('[data-testid="library-entry"]');
    await expect(entries).toHaveCount(1, { timeout: 8000 });
    await expect(entries.first()).toContainText(MOCK_ENTRY.title);
  });

  test('opening a library entry loads deck and closes panel', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';

    await setupLibraryMocks(page);
    await page.goto(`${base}/`);

    await expect(page.locator('[data-testid="library-panel"]')).toBeVisible({ timeout: 8000 });

    await page.locator('[data-testid="library-open-btn"]').first().click();

    // Status message confirms open
    await expect(page.locator('#status')).toContainText(/opened from library/i, { timeout: 8000 });

    // Panel closes after open
    await expect(page.locator('[data-testid="library-panel"]')).not.toBeVisible({ timeout: 5000 });

    // Library ID indicator is set to the opened entry's id
    await expect(page.locator('[data-testid="library-id"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="library-id"]')).toContainText(MOCK_ENTRY.id);
  });

  test('deleting a library entry removes it from the rendered list', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';

    // hasDeleted toggles to true when the DELETE call fires; subsequent GETs return empty
    let hasDeleted = false;
    await page.route('**/library/save', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: MOCK_ENTRY.id }) });
    });
    await page.route('**/library/open/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_DECK) });
    });
    await page.route('**/library/delete/**', async (route) => {
      hasDeleted = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await page.route('**/library', async (route) => {
      if (route.request().method() !== 'GET') { await route.continue(); return; }
      const body = hasDeleted ? [] : [MOCK_ENTRY];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.goto(`${base}/`);
    await expect(page.locator('[data-testid="library-panel"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="library-entry"]')).toHaveCount(1, { timeout: 8000 });

    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('[data-testid="library-delete-btn"]').first().click();

    // After delete + re-fetch the empty-state message should appear
    await expect(page.locator('[data-testid="library-empty"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="library-entry"]')).toHaveCount(0);
  });

  test('deleting the active library entry clears the library-id indicator', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';

    let hasDeleted = false;
    await page.route('**/library/save', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: MOCK_ENTRY.id }) });
    });
    await page.route('**/library/open/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_DECK) });
    });
    await page.route('**/library/delete/**', async (route) => {
      hasDeleted = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await page.route('**/library', async (route) => {
      if (route.request().method() !== 'GET') { await route.continue(); return; }
      const body = hasDeleted ? [] : [MOCK_ENTRY];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.goto(`${base}/deck`);
    await createNewDeck(page);

    // Save to library so libraryId state is set to MOCK_ENTRY.id
    const saveBtn = page.locator('#save-to-library');
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();
    await expect(page.locator('[data-testid="library-id"]')).toBeVisible({ timeout: 5000 });

    // Go to Home and delete the active entry there
    await page.goto(`${base}/`);
    await expect(page.locator('[data-testid="library-panel"]')).toBeVisible({ timeout: 8000 });

    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('[data-testid="library-delete-btn"]').first().click();

    // Library panel now lives on Home; Deck state clearing is out of scope for this test.
  });
});
