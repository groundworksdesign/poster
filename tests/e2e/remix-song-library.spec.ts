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
  test('Helper *.server modules are not exposed as routes', async ({ page, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3010';
    const res = await page.request.get(`${base}/library/loader/server`);
    expect(res.status(), await res.text()).toBe(404);
  });

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

  test('Add-song panel Edit in library opens real manage UI in a new window', async ({
    page,
    context,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3010';
    const errors = attachClientErrorGuards(page);

    const seed = await page.request.post(
      `${base}/library/songs/save?_data=routes%2Flibrary.songs.save`,
      {
        data: {
          title: 'Panel Lib Song',
          book: 'Hymns',
          number: '1',
          lyrics: { title: 'Panel Lib Song', verses: [{ number: 1, lines: ['Hi'] }] },
        },
      },
    );
    expect(seed.ok(), await seed.text()).toBeTruthy();
    const id = ((await seed.json()) as { id: string }).id;

    await page.goto('/deck', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New Deck' }).click();
    await page.getByTestId('add-slide-button').click();
    await page.getByTestId('add-slide-song').click();
    await expect(page.getByTestId('song-type-choice')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('song-type-linked').click();
    await expect(page.getByTestId(`add-song-pick-${id}`)).toBeVisible({ timeout: 15000 });
    await page.getByTestId(`add-song-pick-${id}`).click();
    await expect(page.getByTestId('song-linked-card')).toBeVisible();
    const popupPromise = context.waitForEvent('page');
    await page.getByTestId('song-edit-in-library').click();
    const lib = await popupPromise;
    await lib.waitForLoadState('domcontentloaded');
    await expect(lib).toHaveURL(/\/library\/songs/);
    await assertNotComingSoon(lib);
    await expect(lib.getByTestId('song-library-page')).toBeVisible({ timeout: 15000 });
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
    await page.getByTestId('add-slide-button').click();
    await page.getByTestId('add-slide-title').click();
    await expect(page.locator('#slides')).toContainText(/Title/i);

    await page.getByTestId('add-slide-button').click();
    await page.getByTestId('add-slide-song').click();
    await expect(page.getByTestId('song-type-choice')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('song-type-linked').click();
    await expect(page.getByTestId('song-panel-import-file')).toBeAttached();
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
    await page.setInputFiles('[data-testid="song-panel-import-file"]', {
      name: 'book.json',
      mimeType: 'application/json',
      buffer: Buffer.from(importBody),
    });

    await expect(page.getByTestId('import-review-screen')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('song-also-save-import')).toBeChecked();
    await expect(page.getByTestId('import-title-match-section')).toBeVisible();
    await expect(page.getByTestId('import-match-song-0-keep_both')).toBeChecked();
    await expect(page.getByTestId('import-no-lyrics-section')).toBeVisible();
    await expect(page.getByTestId('import-no-lyrics-title-only')).toBeChecked();
    errors.assertClean();

    await page.getByTestId('import-confirm').click();
    await expect(page.getByTestId('song-multi-import-ready').or(page.getByTestId('song-linked-card'))).toBeVisible({ timeout: 15000 });
    await page.getByTestId('save-slide-button').click();
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

    // Scratch path in panel: Also save unchecked by default; join deck only on Save.
    await page.getByTestId('add-slide-button').click();
    await page.getByTestId('add-slide-song').click();
    await expect(page.getByTestId('song-type-choice')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('song-type-scratch').click();
    await expect(page.getByTestId('pending-song-slide')).toBeVisible();
    await expect(page.getByTestId('song-also-save-scratch')).not.toBeChecked();
    await page.getByTestId('song-scratch-title').fill('Scratch Dup Title');
    await page.getByTestId('song-scratch-words').fill('Scratch new lyrics');
    await page.getByTestId('song-also-save-scratch').check();
    await page.getByTestId('save-slide-button').click();
    await expect(page.getByTestId('import-review-screen')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('import-title-match-section')).toBeVisible();
    await expect(page.getByTestId('import-match-scratch-save-keep_both')).toBeChecked();
    // Confirm stages the link; library write waits for Save slide.
    const beforeConfirmLib = await page.request.get(
      `${base}/library/songs?_data=routes%2Flibrary.songs`,
    );
    const beforeConfirmCount = ((await beforeConfirmLib.json()) as unknown[]).length;
    await page.getByTestId('import-confirm').click();
    await expect(page.getByTestId('song-will-link-on-save')).toBeVisible({ timeout: 15000 });
    const afterConfirmLib = await page.request.get(
      `${base}/library/songs?_data=routes%2Flibrary.songs`,
    );
    expect(((await afterConfirmLib.json()) as unknown[]).length).toBe(beforeConfirmCount);
    await page.getByTestId('save-slide-button').click();
    await expect(page.locator('#slides')).toContainText(/Scratch Dup Title/i);
    // Slide is linked (no longer unlinked scratch-only).
    await expect(page.getByTestId('pending-song-slide')).toHaveCount(0);
    const afterSaveLib = await page.request.get(
      `${base}/library/songs?_data=routes%2Flibrary.songs`,
    );
    const afterSaveSongs = (await afterSaveLib.json()) as { id: string; title: string }[];
    expect(afterSaveSongs.length).toBe(beforeConfirmCount + 1);
    const linked = afterSaveSongs.find(
      s => s.title === 'Scratch Dup Title' && s.id !== existingId,
    );
    expect(linked).toBeTruthy();
    errors.assertClean();

    // Linked path: pick then Save slide.
    await page.getByTestId('add-slide-button').click();
    await page.getByTestId('add-slide-song').click();
    await page.getByTestId('song-type-linked').click();
    await page.getByTestId(`add-song-pick-${linkedJson.id}`).click();
    await expect(page.getByTestId('song-linked-card')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('save-slide-button').click();
    await expect(page.locator('#slides')).toContainText(/Linked Pick Song/i);
    await expect(page.locator('#slides')).toContainText(/Scratch Dup Title/i);
    errors.assertClean();
    errors.detach();
  });

  test('AC-009/014: single clean file shows Also save; Cancel leaves library unchanged', async ({
    page,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3010';
    const errors = attachClientErrorGuards(page);

    await page.goto('/deck', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New Deck' }).click();

    const beforeRes = await page.request.get(
      `${base}/library/songs?_data=routes%2Flibrary.songs`,
    );
    const beforeCount = ((await beforeRes.json()) as unknown[]).length;

    await page.getByTestId('add-slide-button').click();
    await page.getByTestId('add-slide-song').click();
    await page.getByTestId('song-type-linked').click();
    await expect(page.getByTestId('song-panel-import-file')).toBeAttached();

    await page.setInputFiles('[data-testid="song-panel-import-file"]', {
      name: 'solo.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          book: 'Hymns',
          songs: [
            {
              title: 'Solo Clean Import',
              number: '7',
              verses: [{ number: 1, lines: ['Only line'] }],
            },
          ],
        }),
      ),
    });

    await expect(page.getByTestId('song-linked-card')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('song-also-save-import')).toBeChecked();
    await expect(page.getByTestId('song-will-link-on-save')).toBeVisible();

    const midRes = await page.request.get(`${base}/library/songs?_data=routes%2Flibrary.songs`);
    expect(((await midRes.json()) as unknown[]).length).toBe(beforeCount);

    await page.getByTestId('slide-editor-cancel').click();
    await expect(page.getByTestId('pending-song-slide')).toHaveCount(0);

    const afterRes = await page.request.get(`${base}/library/songs?_data=routes%2Flibrary.songs`);
    expect(((await afterRes.json()) as unknown[]).length).toBe(beforeCount);
    errors.assertClean();
    errors.detach();
  });
});
