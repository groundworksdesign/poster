import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * Iris gate: song-library routes must render real UI under the production Remix
 * build (`server.js`), not "Library (coming soon)" from nested flat routes.
 *
 * Served by playwright.remix.song-library.config.ts (isolated from remix-dev).
 */

function assertNotComingSoon(page: Page) {
  return expect(page.getByText('Library (coming soon)')).toHaveCount(0);
}

/** Collect pageerror + console error for Iris process-is-not-defined gate. */
function attachClientErrorGuards(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const onPageError = (err: Error) => {
    pageErrors.push(err.message);
  };
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  return {
    assertClean() {
      expect(pageErrors, `pageerror: ${pageErrors.join(' | ')}`).toEqual([]);
      expect(consoleErrors, `console error: ${consoleErrors.join(' | ')}`).toEqual([]);
    },
    detach() {
      page.off('pageerror', onPageError);
      page.off('console', onConsole);
    },
  };
}

test.describe('Song library (production Remix build)', () => {
  test('Home > Song library > Add, Import, and Edit render real UI', async ({ page, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3010';
    const errors = attachClientErrorGuards(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('song-library-link')).toBeVisible();
    await page.getByTestId('song-library-link').click();
    await expect(page).toHaveURL(/\/library\/songs\/?$/);
    await assertNotComingSoon(page);
    await expect(page.getByTestId('song-library-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Song library', level: 1 })).toBeVisible();
    await expect(page.getByTestId('song-library-add')).toBeVisible();
    await expect(page.getByTestId('song-library-import')).toBeVisible();
    await expect(page.getByTestId('song-library-search')).toBeVisible();
    errors.assertClean();

    await page.getByTestId('song-library-add').click();
    await expect(page).toHaveURL(/\/library\/songs\/add/);
    await assertNotComingSoon(page);
    await expect(page.getByTestId('add-song-by-hand')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('add-song-form')).toBeVisible();
    await expect(page.getByTestId('add-song-title')).toBeVisible();
    await expect(page.getByTestId('add-song-submit')).toBeVisible();
    errors.assertClean();

    const saveRes = await page.request.post(
      `${base}/library/songs/save?_data=routes%2Flibrary.songs.save`,
      {
        data: {
          title: 'Gate Song',
          book: 'Test Book',
          number: '1',
          lyrics: { title: 'Gate Song', verses: [{ number: 1, lines: ['Line one', 'Line two'] }] },
        },
      },
    );
    expect(saveRes.ok(), await saveRes.text()).toBeTruthy();
    const listRes = await page.request.get(
      `${base}/library/songs?usage=1&_data=routes%2Flibrary.songs`,
    );
    expect(listRes.ok()).toBeTruthy();
    expect(await listRes.text()).toContain('Gate Song');

    await page.goto('/library/songs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('song-library-page')).toBeVisible({ timeout: 15000 });
    await assertNotComingSoon(page);
    await expect(page.getByText('Gate Song')).toBeVisible({ timeout: 15000 });
    errors.assertClean();

    const editButton = page.locator('[data-testid^="song-library-edit-"]').first();
    await expect(editButton).toBeVisible();
    await editButton.click();
    await expect(page.getByTestId('song-library-edit-form')).toBeVisible();
    await expect(page.getByTestId('song-library-edit-title')).toHaveValue('Gate Song');
    await expect(page.getByTestId('song-library-edit-save')).toBeVisible();
    await page.getByTestId('song-library-edit-cancel').click();

    await page.getByTestId('song-library-import').click();
    await expect(page).toHaveURL(/\/library\/songs\/import/);
    await assertNotComingSoon(page);
    await expect(page.getByTestId('import-songs-review')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('import-songs-file')).toBeVisible();
    errors.assertClean();
    errors.detach();
  });

  test('Add-song-slide chooser library link opens real manage UI', async ({ page }) => {
    const errors = attachClientErrorGuards(page);

    await page.goto('/deck', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New Deck' }).click();
    await page.locator('#add-slide-type').selectOption('song');
    await page.getByTestId('add-slide-button').click();
    await expect(page.getByTestId('add-song-kind-picker')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('add-song-kind-linked').click();
    await expect(page.getByTestId('add-song-slide-chooser')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('add-song-open-library')).toBeVisible();
    errors.assertClean();

    await page.getByTestId('add-song-open-library').click();
    await expect(page).toHaveURL(/\/library\/songs\/?$/);
    await assertNotComingSoon(page);
    await expect(page.getByTestId('song-library-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('song-library-search')).toBeVisible();
    errors.assertClean();
    errors.detach();
  });

  test('Chooser import shows review for duplicate title and no-lyrics; inserts without replacing deck', async ({
    page,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3010';
    const errors = attachClientErrorGuards(page);

    // Seed an existing library song so import hits title-match.
    const seed = await page.request.post(
      `${base}/library/songs/save?_data=routes%2Flibrary.songs.save`,
      {
        data: {
          title: 'Amazing Grace',
          book: 'Hymns',
          number: '1',
          lyrics: {
            title: 'Amazing Grace',
            verses: [{ number: 1, lines: ['Amazing grace how sweet'] }],
          },
        },
      },
    );
    expect(seed.ok(), await seed.text()).toBeTruthy();

    await page.goto('/deck', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New Deck' }).click();
    // Keep a non-song slide so we can prove import does not replace the deck.
    await page.locator('#add-slide-type').selectOption('title');
    await page.getByTestId('add-slide-button').click();
    await expect(page.locator('#slides')).toContainText(/Title/i);

    await page.locator('#add-slide-type').selectOption('song');
    await page.getByTestId('add-slide-button').click();
    await expect(page.getByTestId('add-song-kind-picker')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('add-song-kind-linked').click();
    await expect(page.getByTestId('add-song-slide-chooser')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('add-song-mode-import').check();
    await expect(page.getByTestId('add-song-also-save')).toBeChecked();
    errors.assertClean();

    const importBody = JSON.stringify({
      book: 'Hymns',
      songs: [
        {
          title: 'Amazing Grace',
          number: '301',
          verses: [{ number: 1, lines: ['Different lyrics here'] }],
        },
        { title: 'No Lyrics Song', number: '9', verses: [] },
      ],
    });
    await page.setInputFiles('[data-testid="add-song-import-file"]', {
      name: 'book.json',
      mimeType: 'application/json',
      buffer: Buffer.from(importBody),
    });

    await expect(page.getByTestId('import-review-screen')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('import-title-match-section')).toBeVisible();
    await expect(page.getByTestId('import-match-song-0-keep_both')).toBeChecked();
    await expect(page.getByTestId('import-no-lyrics-section')).toBeVisible();
    await expect(page.getByTestId('import-no-lyrics-title-only')).toBeChecked();
    errors.assertClean();

    await page.getByTestId('import-confirm').click();
    await expect(page.getByTestId('add-song-slide-chooser')).toHaveCount(0, { timeout: 15000 });
    // Original title slide remains (AC-007: no deck replace).
    await expect(page.locator('#slides')).toContainText(/Title/i);
    await expect(page.locator('#slides')).toContainText(/Amazing Grace/i);
    await expect(page.locator('#slides')).toContainText(/No Lyrics Song/i);
    errors.assertClean();
    errors.detach();
  });

  test('AC-019: scratch blank unlinked; linked insert; scratch Save to library links after title-match', async ({
    page,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3010';
    const errors = attachClientErrorGuards(page);

    const seed = await page.request.post(
      `${base}/library/songs/save?_data=routes%2Flibrary.songs.save`,
      {
        data: {
          title: 'Scratch Dup Title',
          book: 'Hymns',
          number: '12',
          lyrics: {
            title: 'Scratch Dup Title',
            verses: [{ number: 1, lines: ['Library original line'] }],
          },
        },
      },
    );
    expect(seed.ok(), await seed.text()).toBeTruthy();
    const seedJson = (await seed.json()) as { id?: string };
    const existingId = seedJson.id;
    expect(existingId).toBeTruthy();

    // Seed a second library song for the linked-insert path.
    const linkedSeed = await page.request.post(
      `${base}/library/songs/save?_data=routes%2Flibrary.songs.save`,
      {
        data: {
          title: 'Linked Pick Song',
          book: 'Hymns',
          number: '99',
          lyrics: {
            title: 'Linked Pick Song',
            verses: [{ number: 1, lines: ['Linked verse line'] }],
          },
        },
      },
    );
    expect(linkedSeed.ok(), await linkedSeed.text()).toBeTruthy();
    const linkedJson = (await linkedSeed.json()) as { id?: string };
    expect(linkedJson.id).toBeTruthy();

    await page.goto('/deck', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New Deck' }).click();

    // Scratch path: blank in place, no chooser, unlinked.
    await page.locator('#add-slide-type').selectOption('song');
    await page.getByTestId('add-slide-button').click();
    await expect(page.getByTestId('add-song-kind-picker')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('add-song-kind-scratch').click();
    await expect(page.getByTestId('add-song-kind-picker')).toHaveCount(0);
    await expect(page.getByTestId('add-song-slide-chooser')).toHaveCount(0);
    await expect(page.locator('#slides')).toContainText(/Song/i);
    await expect(page.getByTestId('slide-scratch-unlinked')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('save-scratch-to-library')).toBeVisible();
    errors.assertClean();

    // While scratch editor is open: Save to library with duplicate-title review.
    await page
      .getByTestId('deck-slide-editor-panel')
      .getByRole('textbox', { name: 'Title:', exact: true })
      .fill('Scratch Dup Title');
    const lyricsBox = page.locator('#lyrics-json');
    await lyricsBox.fill(
      JSON.stringify(
        {
          title: 'Scratch Dup Title',
          verses: [{ number: 1, lines: ['Scratch new lyrics'] }],
        },
        null,
        2,
      ),
    );
    await page.getByRole('button', { name: 'Apply Lyrics JSON' }).click();
    await page.getByTestId('save-scratch-to-library').click();
    await expect(page.getByTestId('import-review-screen')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('import-title-match-section')).toBeVisible();
    await expect(page.getByTestId('import-match-scratch-save-keep_both')).toBeChecked();
    await page.getByTestId('import-confirm').click();
    await expect(page.getByTestId('slide-library-song-id')).toBeVisible({ timeout: 15000 });
    const linkedId = await page.getByTestId('slide-library-song-id').getAttribute('data-library-song-id');
    expect(linkedId).toBeTruthy();
    expect(linkedId).not.toBe(existingId);
    await expect(page.getByTestId('slide-scratch-unlinked')).toHaveCount(0);
    errors.assertClean();

    // Linked path: chooser insert without replacing deck.
    await page.locator('#add-slide-type').selectOption('song');
    await page.getByTestId('add-slide-button').click();
    await expect(page.getByTestId('add-song-kind-picker')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('add-song-kind-linked').click();
    await expect(page.getByTestId('add-song-slide-chooser')).toBeVisible({ timeout: 15000 });
    await page.getByTestId(`add-song-pick-${linkedJson.id}`).click();
    await expect(page.getByTestId('add-song-slide-chooser')).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator('#slides')).toContainText(/Linked Pick Song/i);
    await expect(page.locator('#slides')).toContainText(/Scratch Dup Title/i);
    errors.assertClean();
    errors.detach();
  });
});
