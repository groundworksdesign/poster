import { test, expect } from '@playwright/test';

/**
 * E2E tests for JSON import validation (task 14) and the save-to-library
 * prompt that appears after a successful import (task 15).
 *
 * All library API calls are intercepted with page.route() mocks so no
 * live Remix server or SQLite database is required.
 *
 * Traceability:
 *   ralph/epic.md "JSON import validation with clear operator-facing errors"
 *   ralph/epic.md "Imports can optionally also write into the library so uploads become first-class records."
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal valid deck that passes validateDeck(). */
const VALID_DECK = JSON.stringify({
  title: 'Import Test Deck',
  date: '2026-04-13',
  location: 'Test Stage',
  useGreenScreen: false,
  notes: '',
  slideStyles: {},
  slides: [{ type: 'general', title: 'Slide One' }],
});

/** Invalid: "title" field is absent. */
const INVALID_NO_TITLE = JSON.stringify({
  date: '2026-04-13',
  slides: [{ type: 'general', title: 'Slide One' }],
});

/** Invalid: "slides" array is absent. */
const INVALID_NO_SLIDES = JSON.stringify({
  title: 'Missing Slides Deck',
  date: '2026-04-13',
});

/** Invalid: slide has an unrecognised type. */
const INVALID_BAD_TYPE = JSON.stringify({
  title: 'Bad Type Deck',
  date: '2026-04-13',
  slides: [{ type: 'mystery', title: 'Unknown Slide' }],
});

const MOCK_SAVE_ID = 'import-test-lib-001';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Upload an in-memory string as a file through the hidden file input. */
async function uploadContent(
  page: import('@playwright/test').Page,
  content: string,
  filename: string,
) {
  await page.locator('#file').setInputFiles({
    name: filename,
    mimeType: 'application/json',
    buffer: Buffer.from(content, 'utf-8'),
  });
  await page.locator('#load').click();
}

/** Wire the save / list library mocks. */
async function setupLibraryMocks(page: import('@playwright/test').Page) {
  await page.route('**/library/save', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: MOCK_SAVE_ID }),
    });
  });

  await page.route('**/library', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: MOCK_SAVE_ID,
            title: 'Import Test Deck',
            date: '2026-04-13',
            location: 'Test Stage',
            created_at: '2026-04-13T15:00:00.000Z',
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });

  // Stub remaining library routes to avoid network errors if called.
  await page.route('**/library/open/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(JSON.parse(VALID_DECK)),
    });
  });

  await page.route('**/library/delete/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Import validation errors', () => {
  test('missing title shows error and no save-to-library prompt', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';
    await setupLibraryMocks(page);
    await page.goto(`${base}/deck`);

    await uploadContent(page, INVALID_NO_TITLE, 'no-title.json');

    // Validation error message should mention "title"
    const status = page.locator('#status');
    await expect(status).toBeVisible({ timeout: 8000 });
    await expect(status).toContainText(/title/i, { timeout: 8000 });

    // Save-to-library prompt must NOT appear
    await expect(page.locator('#import-save-to-library')).not.toBeVisible();
  });

  test('missing slides array shows error and no save-to-library prompt', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';
    await setupLibraryMocks(page);
    await page.goto(`${base}/deck`);

    await uploadContent(page, INVALID_NO_SLIDES, 'no-slides.json');

    const status = page.locator('#status');
    await expect(status).toBeVisible({ timeout: 8000 });
    await expect(status).toContainText(/slides/i, { timeout: 8000 });

    await expect(page.locator('#import-save-to-library')).not.toBeVisible();
  });

  test('unknown slide type shows error and no save-to-library prompt', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';
    await setupLibraryMocks(page);
    await page.goto(`${base}/deck`);

    await uploadContent(page, INVALID_BAD_TYPE, 'bad-type.json');

    const status = page.locator('#status');
    await expect(status).toBeVisible({ timeout: 8000 });
    // Validator message references the unknown type value
    await expect(status).toContainText(/type/i, { timeout: 8000 });

    await expect(page.locator('#import-save-to-library')).not.toBeVisible();
  });
});

test.describe('Save-to-library prompt after import', () => {
  test('valid JSON deck import shows save-to-library prompt', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';
    await setupLibraryMocks(page);
    await page.goto(`${base}/deck`);

    await uploadContent(page, VALID_DECK, 'valid-deck.json');

    await expect(page.locator('#status')).toContainText(/loaded json deck/i, { timeout: 8000 });
    await expect(page.locator('#import-save-to-library')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#import-skip-save-to-library')).toBeVisible();
  });

  test('clicking Skip dismisses the prompt without calling /library/save', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';

    let saveCallCount = 0;
    await page.route('**/library/save', async (route) => {
      saveCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: MOCK_SAVE_ID }),
      });
    });
    await page.route('**/library', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/library/open/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.route('**/library/delete/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto(`${base}/deck`);
    await uploadContent(page, VALID_DECK, 'valid-deck.json');

    await expect(page.locator('#import-save-to-library')).toBeVisible({ timeout: 8000 });

    await page.locator('#import-skip-save-to-library').click();

    // Prompt is dismissed
    await expect(page.locator('#import-save-to-library')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('#import-skip-save-to-library')).not.toBeVisible();

    // No save call was made
    expect(saveCallCount).toBe(0);
  });

  test('clicking Save to Library persists deck and dismisses the prompt', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';
    await setupLibraryMocks(page);
    await page.goto(`${base}/deck`);

    await uploadContent(page, VALID_DECK, 'valid-deck.json');
    await expect(page.locator('#import-save-to-library')).toBeVisible({ timeout: 8000 });

    await page.locator('#import-save-to-library').click();

    // Prompt is dismissed
    await expect(page.locator('#import-save-to-library')).not.toBeVisible({ timeout: 5000 });

    // Status message confirms save
    await expect(page.locator('#status')).toContainText(/saved to library|library updated/i, { timeout: 8000 });

    // Library ID indicator is set to the returned id
    await expect(page.locator('[data-testid="library-id"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="library-id"]')).toContainText(MOCK_SAVE_ID);
  });

  test('deck opened from library does not re-show prompt on subsequent import', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://127.0.0.1:3001';
    await setupLibraryMocks(page);
    await page.goto(`${base}/deck`);

    // First: import valid deck and save it to set libraryId
    await uploadContent(page, VALID_DECK, 'first.json');
    await expect(page.locator('#import-save-to-library')).toBeVisible({ timeout: 8000 });
    await page.locator('#import-save-to-library').click();
    await expect(page.locator('#import-save-to-library')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="library-id"]')).toBeVisible({ timeout: 5000 });

    // Second: import a fresh valid deck (no libraryId in JSON) -- prompt should appear again
    const SECOND_DECK = JSON.stringify({
      title: 'Second Import Deck',
      date: '2026-04-13',
      slides: [{ type: 'general', title: 'Slide A' }],
    });
    await uploadContent(page, SECOND_DECK, 'second.json');
    await expect(page.locator('#status')).toContainText(/loaded json deck/i, { timeout: 8000 });
    // A fresh import (no id in payload) should trigger the prompt
    await expect(page.locator('#import-save-to-library')).toBeVisible({ timeout: 8000 });
  });
});
