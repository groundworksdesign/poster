import { test, expect, type Page } from '@playwright/test';

/**
 * Iris gate: song-library routes must render real UI under the production Remix
 * build (`server.js`), not "Library (coming soon)" from nested flat routes.
 *
 * Served by playwright.remix.song-library.config.ts (isolated from remix-dev).
 */

function assertNotComingSoon(page: Page) {
  return expect(page.getByText('Library (coming soon)')).toHaveCount(0);
}

test.describe('Song library (production Remix build)', () => {
  test('Home > Song library > Add, Import, and Edit render real UI', async ({ page, baseURL }) => {
    const base = baseURL || 'http://127.0.0.1:3010';

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

    await page.getByTestId('song-library-add').click();
    await expect(page).toHaveURL(/\/library\/songs\/add/);
    await assertNotComingSoon(page);
    await expect(page.getByTestId('add-song-by-hand')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('add-song-form')).toBeVisible();
    await expect(page.getByTestId('add-song-title')).toBeVisible();
    await expect(page.getByTestId('add-song-submit')).toBeVisible();

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
  });

  test('Add-song-slide chooser library link opens real manage UI', async ({ page }) => {
    await page.goto('/deck', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New Deck' }).click();
    await page.locator('#add-slide-type').selectOption('song');
    await page.getByTestId('add-slide-button').click();
    await expect(page.getByTestId('add-song-slide-chooser')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('add-song-open-library')).toBeVisible();

    await page.getByTestId('add-song-open-library').click();
    await expect(page).toHaveURL(/\/library\/songs\/?$/);
    await assertNotComingSoon(page);
    await expect(page.getByTestId('song-library-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('song-library-search')).toBeVisible();
  });
});
