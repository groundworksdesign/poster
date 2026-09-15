import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Uses the on-disk JSON library when SQLite isn't available. Ensure a clean state.
const libPath =
  process.env.POSTER_LIBRARY_JSON_PATH ?? path.join(path.resolve(__dirname, '..', '..'), 'poster.library.json');

// ---------------------------------------------------------------------------
// Fixtures / test data
// ---------------------------------------------------------------------------
const VALID_DECK = JSON.stringify({
  title: 'Import Test Deck',
  date: '2026-04-13',
  location: 'Test Stage',
  useGreenScreen: false,
  notes: '',
  slideStyles: {},
  slides: [{ type: 'general', title: 'Slide One' }],
});

const INVALID_NO_TITLE = JSON.stringify({
  date: '2026-04-13',
  slides: [{ type: 'general', title: 'Slide One' }],
});

const INVALID_NO_SLIDES = JSON.stringify({
  title: 'Missing Slides Deck',
  date: '2026-04-13',
});

const INVALID_BAD_TYPE = JSON.stringify({
  title: 'Bad Type Deck',
  date: '2026-04-13',
  slides: [{ type: 'mystery', title: 'Unknown Slide' }],
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function uploadContent(page: import('@playwright/test').Page, content: string, filename: string) {
  await page.locator('#file').setInputFiles({
    name: filename,
    mimeType: 'application/json',
    buffer: Buffer.from(content, 'utf-8'),
  });
  await page.locator('#load').click();
}

function removeLibraryFileIfExists() {
  try {
    if (fs.existsSync(libPath)) fs.unlinkSync(libPath);
  } catch (e) {
    // best-effort cleanup
  }
}

// Clean library before each test to make assertions deterministic
test.beforeEach(async () => {
  removeLibraryFileIfExists();
});

// ---------------------------------------------------------------------------
// Tests (run against remix dev server via playwright.remix.config.ts)
// ---------------------------------------------------------------------------

test.describe('Import validation errors (remix dev)', () => {
  test('missing title shows error and no save-to-library prompt', async ({ page }) => {
    await page.goto('/deck');

    await uploadContent(page, INVALID_NO_TITLE, 'no-title.json');

    const status = page.locator('#status');
    await expect(status).toBeVisible({ timeout: 8000 });
    await expect(status).toContainText(/title/i, { timeout: 8000 });

    await expect(page.locator('#import-save-to-library')).not.toBeVisible();
  });

  test('missing slides array shows error and no save-to-library prompt', async ({ page }) => {
    await page.goto('/deck');

    await uploadContent(page, INVALID_NO_SLIDES, 'no-slides.json');

    const status = page.locator('#status');
    await expect(status).toBeVisible({ timeout: 8000 });
    await expect(status).toContainText(/slides/i, { timeout: 8000 });

    await expect(page.locator('#import-save-to-library')).not.toBeVisible();
  });

  test('unknown slide type shows error and no save-to-library prompt', async ({ page }) => {
    await page.goto('/deck');

    await uploadContent(page, INVALID_BAD_TYPE, 'bad-type.json');

    const status = page.locator('#status');
    await expect(status).toBeVisible({ timeout: 8000 });
    await expect(status).toContainText(/type/i, { timeout: 8000 });

    await expect(page.locator('#import-save-to-library')).not.toBeVisible();
  });
});

test.describe('Save-to-library prompt after import (remix dev)', () => {
  test('valid JSON deck import shows save-to-library prompt', async ({ page }) => {
    await page.goto('/deck');

    await uploadContent(page, VALID_DECK, 'valid-deck.json');

    await expect(page.locator('#status')).toContainText(/loaded json deck/i, { timeout: 8000 });
    await expect(page.locator('#import-save-to-library')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#import-skip-save-to-library')).toBeVisible();
  });

  test('clicking Skip dismisses the prompt and does not call save', async ({ page }) => {
    await page.goto('/deck');

    let saveCalls = 0;
    page.on('request', (req) => {
      try {
        if (req.method() === 'POST' && req.url().includes('/library/save')) saveCalls++;
      } catch (e) {
        /* ignore */
      }
    });

    await uploadContent(page, VALID_DECK, 'valid-deck.json');
    await expect(page.locator('#import-save-to-library')).toBeVisible({ timeout: 8000 });

    await page.locator('#import-skip-save-to-library').click();
    await expect(page.locator('#import-save-to-library')).not.toBeVisible({ timeout: 5000 });

    // No POST /library/save should have been made
    expect(saveCalls).toBe(0);
  });

  test('clicking Save to Library persists deck and dismisses the prompt', async ({ page, request }) => {
    let saveCalls = 0;
    page.on('request', (req) => {
      try {
        if (req.method() === 'POST' && req.url().includes('/library/save')) saveCalls++;
      } catch (e) {
        /* ignore */
      }
    });

    await page.goto('/deck');

    await uploadContent(page, VALID_DECK, 'valid-deck.json');
    await expect(page.locator('#import-save-to-library')).toBeVisible({ timeout: 8000 });

    await page.locator('#import-save-to-library').click();
    await expect(page.locator('#import-save-to-library')).not.toBeVisible({ timeout: 5000 });

    await expect(page.locator('#status')).toContainText(/saved to library|library updated/i, { timeout: 8000 });

    // Verify server-side listing contains the saved item
    const libRes = await request.get('/library?_data=routes%2Flibrary');
    expect(libRes.ok()).toBeTruthy();
    const lib = await libRes.json();
    expect(Array.isArray(lib)).toBe(true);
    expect(lib.length).toBeGreaterThan(0);
    const found = lib.find((i: any) => i.title === 'Import Test Deck');
    expect(found).toBeTruthy();
  });
});
