import { test, expect, type Page } from '@playwright/test';
import { spawn, type ChildProcess, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { REPO_ROOT } from './repoRoot';

/**
 * Iris gate: song-library routes must render real UI under the production Remix
 * build (`server.js`), not "Library (coming soon)" from nested flat routes.
 */

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Could not allocate an ephemeral port');
  }
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve())),
  );
  return port;
}

function ensureRemixBuild(): void {
  const buildIndex = path.join(REPO_ROOT, 'build', 'index.js');
  if (fs.existsSync(buildIndex)) return;
  execFileSync('pnpm', ['run', 'build:remix'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });
}

function startProdServer(port: number, home: string): ChildProcess {
  const env = { ...process.env, HOME: home, PORT: String(port), NODE_ENV: 'production' };
  delete env.POSTER_HOME;
  delete env.POSTER_LIBRARY_PATH;
  delete env.POSTER_DB_PATH;
  delete env.POSTER_LIBRARY_JSON_PATH;
  return spawn(process.execPath, [path.join(REPO_ROOT, 'src', 'adapters', 'persistence', 'server.js')], {
    cwd: REPO_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function waitForServer(base: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/`);
      if (response.ok) return;
    } catch {
      // still starting
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${base}`);
}

async function stopServer(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null) return;
  server.kill('SIGTERM');
  await new Promise<void>(resolve => {
    const timer = setTimeout(resolve, 5000);
    server.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function assertNotComingSoon(page: Page) {
  return expect(page.getByText('Library (coming soon)')).toHaveCount(0);
}

test.describe('Song library (production Remix build)', () => {
  let home: string;
  let sandbox: string;
  let port: number;
  let base: string;
  let server: ChildProcess;

  test.beforeAll(async () => {
    // Always rebuild so this suite exercises the latest route tree under server.js.
    execFileSync('pnpm', ['run', 'build:remix'], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    });
    ensureRemixBuild();
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-song-library-e2e-'));
    home = path.join(sandbox, 'home');
    fs.mkdirSync(home, { recursive: true });
    port = await freePort();
    base = `http://127.0.0.1:${port}`;
    server = startProdServer(port, home);
    await waitForServer(base);
  });

  test.afterAll(async () => {
    await stopServer(server);
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  test('Home > Song library > Add, Import, and Edit render real UI', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: base });
    const page = await context.newPage();

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

    // Seed via absolute URL on the production server (not the remix-dev webServer).
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
    const listRes = await page.request.get(`${base}/library/songs?usage=1&_data=routes%2Flibrary.songs`);
    expect(listRes.ok()).toBeTruthy();
    expect(await listRes.text()).toContain('Gate Song');

    await page.goto(`${base}/library/songs`, { waitUntil: 'domcontentloaded' });
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

    await context.close();
  });

  test('Add-song-slide chooser library link opens real manage UI', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: base });
    const page = await context.newPage();

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

    await context.close();
  });
});
