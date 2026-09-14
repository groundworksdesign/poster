import fs from 'fs';
import os from 'os';
import path from 'path';

/** Mirrors db.server's documented driver fallback: better-sqlite3, then node:sqlite. */
function sqliteBindingsAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3') as typeof import('better-sqlite3');
    const database = new Database(':memory:');
    database.close();
    return true;
  } catch {
    try {
      const getBuiltinModule = (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule;
      const builtin = typeof getBuiltinModule === 'function' ? getBuiltinModule('node:sqlite') : undefined;
      const { DatabaseSync } = (builtin ??
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        (require('node:sqlite') as typeof import('node:sqlite'))) as typeof import('node:sqlite');
      const database = new DatabaseSync(':memory:');
      database.close();
      return true;
    } catch {
      return false;
    }
  }
}

const describeSqlite = sqliteBindingsAvailable() ? describe : describe.skip;

describeSqlite('durable SQLite library', () => {
  it('keeps presentations available after the working directory is removed', () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'poster-library-'));
    const home = path.join(sandbox, 'home');
    const cwd = path.join(sandbox, 'cwd');
    const libraryRoot = path.join(home, '.poster');
    fs.mkdirSync(cwd, { recursive: true });

    const previousHome = process.env.HOME;
    const previousPosterHome = process.env.POSTER_HOME;
    const previousLibraryPath = process.env.POSTER_LIBRARY_PATH;
    const previousDbPath = process.env.POSTER_DB_PATH;
    const previousJsonPath = process.env.POSTER_LIBRARY_JSON_PATH;
    const previousCwd = process.cwd();
    process.env.HOME = home;
    delete process.env.POSTER_HOME;
    delete process.env.POSTER_LIBRARY_PATH;
    delete process.env.POSTER_DB_PATH;
    delete process.env.POSTER_LIBRARY_JSON_PATH;
    process.chdir(cwd);
    jest.resetModules();

    // os.homedir() caches its value process-wide, so pin it to the sandbox home.
    const homedirSpy = jest.spyOn(os, 'homedir').mockReturnValue(home);

    try {
      // Load the same singleton-backed modules used by the library routes.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const dbModule = require('../adapters/persistence/db.server') as typeof import('../adapters/persistence/db.server');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const libraryModule = require('../adapters/persistence/library.server') as typeof import('../adapters/persistence/library.server');
      const id = libraryModule.upsertPresentation({
        title: 'Durable presentation',
        date: '2026-09-06',
        location: 'Main stage',
        notes: '',
        useGreenScreen: false,
        slideStyles: {},
        slides: [],
      });
      expect(dbModule.dbPath).toBe(path.join(libraryRoot, 'poster.sqlite'));
      expect(fs.existsSync(dbModule.dbPath)).toBe(true);

      process.chdir(sandbox);
      fs.rmSync(cwd, { recursive: true, force: true });
      dbModule.tryGetSqliteDb()?.close();
      jest.resetModules();

      // Reopen through production initialization, not a direct SQLite handle.
      const reopenedDb = require('../adapters/persistence/db.server') as typeof import('../adapters/persistence/db.server');
      const reopened = reopenedDb.tryGetSqliteDb();
      expect(reopened).not.toBeNull();
      const row = reopened!
        .prepare('SELECT id, title FROM presentations WHERE id = ?')
        .get(id) as { id: string; title: string };
      expect(row).toEqual({ id, title: 'Durable presentation' });
    } finally {
      process.chdir(previousCwd);
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousPosterHome === undefined) delete process.env.POSTER_HOME;
      else process.env.POSTER_HOME = previousPosterHome;
      if (previousLibraryPath === undefined) delete process.env.POSTER_LIBRARY_PATH;
      else process.env.POSTER_LIBRARY_PATH = previousLibraryPath;
      if (previousDbPath === undefined) delete process.env.POSTER_DB_PATH;
      else process.env.POSTER_DB_PATH = previousDbPath;
      if (previousJsonPath === undefined) delete process.env.POSTER_LIBRARY_JSON_PATH;
      else process.env.POSTER_LIBRARY_JSON_PATH = previousJsonPath;
      homedirSpy.mockRestore();
      jest.resetModules();
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
