import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { hasLibraryStore, listLibraryRootFiles } from './libraryStoreHelpers';

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
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  return port;
}

function startServer(port: number, home: string): ChildProcess {
  const env = { ...process.env, HOME: home, PORT: String(port) };
  delete env.POSTER_HOME;
  delete env.POSTER_LIBRARY_PATH;
  delete env.POSTER_DB_PATH;
  delete env.POSTER_LIBRARY_JSON_PATH;
  return spawn(process.execPath, [path.join(process.cwd(), 'src', 'adapters', 'persistence', 'server.js')], {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function waitForServer(base: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/`);
      if (response.ok) return;
    } catch {
      // The child is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${base}`);
}

async function stopServer(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null) return;
  server.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 5000);
    server.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

test('changing the library folder re-points without moving the old folder', async ({ browser }) => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-library-repoint-'));
  const home = path.join(sandbox, 'home');
  const oldRoot = path.join(sandbox, 'old-library');
  const newRoot = path.join(sandbox, 'new-library');
  const sentinel = path.join(oldRoot, 'operator-note.txt');
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(oldRoot, { recursive: true });
  fs.mkdirSync(newRoot, { recursive: true });
  fs.writeFileSync(sentinel, 'leave this library untouched');

  const previousHome = process.env.HOME;
  const previousPosterHome = process.env.POSTER_HOME;
  process.env.HOME = home;
  delete process.env.POSTER_HOME;

  let server: ChildProcess | undefined;
  try {
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    server = startServer(port, home);
    await waitForServer(base);

    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      const configure = async (root: string) => {
        const response = await page.evaluate(async (libraryRoot) => {
          const result = await fetch('/library/settings?_data=routes%2Flibrary.settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ libraryRoot }),
          });
          return { ok: result.ok, body: await result.json() as { libraryRoot?: string } };
        }, root);
        expect(response.ok).toBe(true);
        expect(response.body.libraryRoot).toBe(root);
      };

      await configure(oldRoot);
      const saved = await page.evaluate(async () => {
        const response = await fetch('/library/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Stay in the old library',
            date: '',
            location: '',
            notes: '',
            useGreenScreen: false,
            slideStyles: {},
            slides: [],
          }),
        });
        return (await response.json()) as { id?: string };
      });
      expect(saved.id).toBeTruthy();
      // Accept sqlite or JSON fallback — whichever backend the runtime actually uses.
      await expect.poll(() => hasLibraryStore(oldRoot)).toBe(true);
      const oldFiles = listLibraryRootFiles(oldRoot);

      await page.reload();
      await expect(page.getByText(`Library folder: ${oldRoot}`)).toBeVisible();
      await page.once('dialog', (dialog) => dialog.accept(newRoot));
      await page.getByRole('button', { name: 'Change...' }).click();
      await expect(page.getByText(`Library folder: ${newRoot}`)).toBeVisible();

      expect(hasLibraryStore(oldRoot)).toBe(true);
      expect(listLibraryRootFiles(oldRoot)).toEqual(oldFiles);
      expect(fs.readFileSync(sentinel, 'utf8')).toBe('leave this library untouched');
      const newEntries = await page.evaluate(async () => {
        const response = await fetch('/library?_data=routes%2Flibrary');
        return await response.json() as Array<{ title: string }>;
      });
      expect(newEntries).toEqual([]);
    } finally {
      await context.close();
    }
  } finally {
    if (server) await stopServer(server);
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
    if (previousPosterHome === undefined) delete process.env.POSTER_HOME;
    else process.env.POSTER_HOME = previousPosterHome;
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});
