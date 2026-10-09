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
    // Two songs (title-match + no-lyrics) → multi-import ready (not a single card).
    await expect(page.getByTestId('song-multi-import-ready')).toBeVisible({ timeout: 15000 });
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
    // Re-open the *song* row (New Deck already has a Title slide — not .first()).
    const songRow = page.locator('#slides li').filter({ hasText: /Scratch Dup Title/i });
    await songRow.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByTestId('slide-library-song-id')).toBeVisible({ timeout: 15000 });
    const slideLibId = await page
      .getByTestId('slide-library-song-id')
      .getAttribute('data-library-song-id');
    expect(slideLibId).toBe(linked!.id);
    expect(slideLibId).not.toBe(existingId);
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

  test('Iris Esc: 3 real Esc presses clear search → type choice → cancel', async ({
    page,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3010';
    const errors = attachClientErrorGuards(page);

    const seed = await page.request.post(
      `${base}/library/songs/save?_data=routes%2Flibrary.songs.save`,
      {
        data: {
          title: 'Esc Probe Song',
          book: 'Hymns',
          number: '1',
          lyrics: {
            title: 'Esc Probe Song',
            verses: [{ number: 1, lines: ['probe line'] }],
          },
        },
      },
    );
    expect(seed.ok(), await seed.text()).toBeTruthy();

    const beforeLib = await page.request.get(
      `${base}/library/songs?_data=routes%2Flibrary.songs`,
    );
    const beforeCount = ((await beforeLib.json()) as unknown[]).length;

    await page.goto('/deck', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New Deck' }).click();
    await page.getByTestId('add-slide-button').click();
    await page.getByTestId('add-slide-song').click();
    await expect(page.getByTestId('song-type-choice')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('song-type-linked').click();
    const search = page.getByTestId('library-song-search');
    await expect(search).toBeVisible({ timeout: 15000 });
    await search.fill('Esc Probe');
    await expect(search).toHaveValue('Esc Probe');

    // Esc 1: clear search
    await search.press('Escape');
    await expect(search).toHaveValue('');
    await expect(page.getByTestId('library-song-picker')).toBeVisible();
    await expect(page.getByTestId('pending-song-slide')).toBeVisible();

    // Esc 2: type choice (must not be a dead press)
    await search.press('Escape');
    await expect(page.getByTestId('song-type-choice')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('pending-song-slide')).toBeVisible();

    // Esc 3: cancel — nothing left in deck or library
    await page.getByTestId('song-type-choice').press('Escape');
    await expect(page.getByTestId('pending-song-slide')).toHaveCount(0);
    await expect(page.getByTestId('deck-slide-editor-panel')).toHaveCount(0);

    const afterLib = await page.request.get(
      `${base}/library/songs?_data=routes%2Flibrary.songs`,
    );
    expect(((await afterLib.json()) as unknown[]).length).toBe(beforeCount);
    errors.assertClean();
    errors.detach();
  });

  test('Iris Esc: existing song with unsaved words asks before discard', async ({ page }) => {
    const errors = attachClientErrorGuards(page);
    await page.goto('/deck', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New Deck' }).click();
    await page.getByTestId('add-slide-button').click();
    await page.getByTestId('add-slide-song').click();
    await page.getByTestId('song-type-scratch').click();
    await page.getByTestId('song-scratch-title').fill('esc one');
    await page.getByTestId('song-scratch-words').fill('probe one');
    await page.getByTestId('save-slide-button').click();
    await expect(page.locator('#slides')).toContainText(/esc one/i);

    const songRow = page.locator('#slides li').filter({ hasText: /esc one/i });
    await songRow.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByTestId('song-scratch-words')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('song-scratch-words').fill('probe one CHANGED');

    page.once('dialog', async dialog => {
      expect(dialog.message()).toMatch(/Discard unsaved changes/i);
      await dialog.dismiss();
    });
    await page.getByTestId('song-scratch-words').press('Escape');
    await expect(page.getByTestId('deck-slide-editor-panel')).toBeVisible();
    await expect(page.getByTestId('song-scratch-words')).toHaveValue('probe one CHANGED');

    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await page.getByTestId('song-scratch-words').press('Escape');
    await expect(page.getByTestId('deck-slide-editor-panel')).toHaveCount(0);

    // Reopen: unsaved words were discarded
    await songRow.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByTestId('song-scratch-words')).toHaveValue('probe one');
    errors.assertClean();
    errors.detach();
  });

  /** Type real key events one character at a time (catches focus-steal bugs fill() misses). */
  async function typeKeysKeepFocus(
    page: Page,
    testId: string,
    text: string,
  ) {
    const field = page.getByTestId(testId);
    await field.click();
    await field.pressSequentially(text, { delay: 15 });
    await expect(field).toBeFocused();
    await expect(field).toHaveValue(text);
    // Panel must still be open — Space/Enter must not have triggered Save slide.
    await expect(page.getByTestId('deck-slide-editor-panel')).toBeVisible();
  }

  test('Iris/Race: hand-edit typing keeps focus; Save only on explicit click', async ({
    page,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3010';
    const errors = attachClientErrorGuards(page);
    const seed = await page.request.post(
      `${base}/library/songs/save?_data=routes%2Flibrary.songs.save`,
      {
        data: {
          title: 'Handtype Focus Song',
          book: 'Hymns',
          number: '4',
          lyrics: {
            title: 'Handtype Focus Song',
            verses: [{ number: 1, lines: ['LIBRARY line'] }],
          },
        },
      },
    );
    expect(seed.ok(), await seed.text()).toBeTruthy();
    const id = ((await seed.json()) as { id: string }).id;

    await page.goto('/deck', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New Deck' }).click();
    await page.getByTestId('add-slide-button').click();
    await page.getByTestId('add-slide-song').click();
    await page.getByTestId('song-type-linked').click();
    await page.getByTestId(`add-song-pick-${id}`).click();
    await expect(page.getByTestId('save-slide-button')).toBeFocused({ timeout: 5000 });
    await page.getByTestId('save-slide-button').click();
    await expect(page.locator('#slides')).toContainText(/Handtype Focus Song/i);

    const songRow = page.locator('#slides li').filter({ hasText: /Handtype Focus Song/i });
    await songRow.getByRole('button', { name: 'Edit' }).click();
    await page.getByTestId('song-edit-words-on-slide').click();
    const typed = 'alpha beta gamma';
    await typeKeysKeepFocus(page, 'song-hand-edit-words', typed);
    await page.getByTestId('save-slide-button').click();
    await expect(page.getByTestId('deck-slide-editor-panel')).toHaveCount(0);

    await songRow.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByTestId('song-hand-edit-note')).toBeVisible({ timeout: 15000 });
    // Already hand-edited → editor unlocks on open (no second "Edit words" click).
    await expect(page.getByTestId('song-hand-edit-words')).toHaveValue(typed);
    errors.assertClean();
    errors.detach();
  });

  test('Race: search and scratch fields keep focus while typing real keys', async ({
    page,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3010';
    const errors = attachClientErrorGuards(page);
    const seed = await page.request.post(
      `${base}/library/songs/save?_data=routes%2Flibrary.songs.save`,
      {
        data: {
          title: 'Search Keep Focus',
          book: 'Hymns',
          number: '5',
          lyrics: {
            title: 'Search Keep Focus',
            verses: [{ number: 1, lines: ['line'] }],
          },
        },
      },
    );
    expect(seed.ok(), await seed.text()).toBeTruthy();

    await page.goto('/deck', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New Deck' }).click();

    // Search box: key-by-key including a space; no save / no panel close.
    await page.getByTestId('add-slide-button').click();
    await page.getByTestId('add-slide-song').click();
    await page.getByTestId('song-type-linked').click();
    await expect(page.getByTestId('library-song-search')).toBeVisible({ timeout: 15000 });
    await typeKeysKeepFocus(page, 'library-song-search', 'Search Keep');
    await expect(page.getByTestId('pending-song-slide')).toBeVisible();
    await page.getByTestId('slide-editor-cancel').click();
    await expect(page.getByTestId('pending-song-slide')).toHaveCount(0);

    // Scratch Title, Book, Number, Words — each keeps focus; save only on button.
    await page.getByTestId('add-slide-button').click();
    await page.getByTestId('add-slide-song').click();
    await page.getByTestId('song-type-scratch').click();
    await expect(page.getByTestId('song-scratch-title')).toBeVisible({ timeout: 15000 });
    await typeKeysKeepFocus(page, 'song-scratch-title', 'scratch title x');
    await typeKeysKeepFocus(page, 'song-scratch-book', 'book name');
    await typeKeysKeepFocus(page, 'song-scratch-number', '12 a');
    await typeKeysKeepFocus(page, 'song-scratch-words', 'line one two');
    await expect(page.getByTestId('pending-song-slide')).toBeVisible();
    await page.getByTestId('save-slide-button').click();
    await expect(page.getByTestId('pending-song-slide')).toHaveCount(0);
    await expect(page.locator('#slides')).toContainText(/scratch title x/i);

    const songRow = page.locator('#slides li').filter({ hasText: /scratch title x/i });
    await songRow.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByTestId('song-scratch-title')).toHaveValue('scratch title x');
    await expect(page.getByTestId('song-scratch-book')).toHaveValue('book name');
    await expect(page.getByTestId('song-scratch-number')).toHaveValue('12 a');
    await expect(page.getByTestId('song-scratch-words')).toHaveValue('line one two');
    errors.assertClean();
    errors.detach();
  });

  test('Iris: hand-edit save is labelled edited by hand on library update', async ({
    page,
    baseURL,
  }) => {
    const base = baseURL || 'http://127.0.0.1:3010';
    const errors = attachClientErrorGuards(page);

    const seed = await page.request.post(
      `${base}/library/songs/save?_data=routes%2Flibrary.songs.save`,
      {
        data: {
          title: 'Hand Edit Label Song',
          book: 'Hymns',
          number: '3',
          lyrics: {
            title: 'Hand Edit Label Song',
            verses: [{ number: 1, lines: ['LIBRARY one', 'LIBRARY two'] }],
          },
        },
      },
    );
    expect(seed.ok(), await seed.text()).toBeTruthy();
    const id = ((await seed.json()) as { id: string }).id;

    await page.goto('/deck', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New Deck' }).click();
    await page.getByTestId('add-slide-button').click();
    await page.getByTestId('add-slide-song').click();
    await page.getByTestId('song-type-linked').click();
    await page.getByTestId(`add-song-pick-${id}`).click();
    await page.getByTestId('save-slide-button').click();
    await expect(page.locator('#slides')).toContainText(/Hand Edit Label Song/i);

    const songRow = page.locator('#slides li').filter({ hasText: /Hand Edit Label Song/i });
    await songRow.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByTestId('song-edit-words-on-slide')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('song-edit-words-on-slide').click();
    await page.getByTestId('song-hand-edit-words').fill('HAND EDITED one\nHAND EDITED two');
    await page.getByTestId('save-slide-button').click();
    await expect(page.getByTestId('deck-slide-editor-panel')).toHaveCount(0);

    // Persist deck so library edit can find the linked slide.
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(/saved to library|updated in library/i)).toBeVisible({
      timeout: 15000,
    });

    // Change library words → update prompt must say edited by hand (not Not updated).
    await page.goto('/library/songs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('song-library-page')).toBeVisible({ timeout: 15000 });
    await page.getByTestId(`song-library-edit-${id}`).click();
    await expect(page.getByTestId('song-library-edit-form')).toBeVisible();
    await page.getByTestId('song-library-edit-verses').fill('LIBRARY v2 a\nLIBRARY v2 b');
    await page.getByTestId('song-library-edit-save').click();
    await expect(page.getByTestId('update-decks-prompt')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('update-decks-prompt')).toContainText(/edited by hand/i);
    await expect(page.getByTestId('update-decks-prompt')).not.toContainText(
      /Not updated to the latest library version/i,
    );
    errors.assertClean();
    errors.detach();
  });
});
