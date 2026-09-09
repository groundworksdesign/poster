import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { hasLibraryStore } from './libraryStoreHelpers';

const deck = {
  title: 'Durable after relaunch',
  date: '2026-09-06',
  location: 'Main stage',
  notes: '',
  useGreenScreen: false,
  slideStyles: {},
  slides: [],
};

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
  return spawn(process.execPath, [path.join(process.cwd(), 'server', 'index.js')], {
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

test('library entries survive a full server quit and relaunch in default HOME library', async ({
  browser,
}) => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-library-relaunch-'));
  const home = path.join(sandbox, 'home');
  fs.mkdirSync(home, { recursive: true });
  let server: ChildProcess | undefined;

  try {
    const firstPort = await freePort();
    const firstBase = `http://127.0.0.1:${firstPort}`;
    server = startServer(firstPort, home);
    await waitForServer(firstBase);

    const first = await browser.newContext();
    const firstPage = await first.newPage();
    await firstPage.goto(`${firstBase}/`, { waitUntil: 'domcontentloaded' });
    await expect(firstPage.getByText(`Library folder: ${path.join(home, '.poster')}`)).toBeVisible();
    const saved = await firstPage.evaluate(async (value) => {
      const response = await fetch('/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      return (await response.json()) as { id?: string };
    }, deck);
    expect(saved.id).toBeTruthy();
    await first.close();
    // Accept sqlite or JSON fallback — whichever backend the runtime actually uses.
    expect(hasLibraryStore(path.join(home, '.poster'))).toBe(true);
    await stopServer(server);
    server = undefined;

    const secondPort = await freePort();
    const secondBase = `http://127.0.0.1:${secondPort}`;
    server = startServer(secondPort, home);
    await waitForServer(secondBase);
    const relaunched = await browser.newContext();
    const secondPage = await relaunched.newPage();
    try {
      await secondPage.goto(`${secondBase}/`, { waitUntil: 'domcontentloaded' });
      await expect(secondPage.getByTestId('library-entry').filter({ hasText: deck.title })).toBeVisible();
    } finally {
      await relaunched.close();
    }
  } finally {
    if (server) await stopServer(server);
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});
