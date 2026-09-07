type SqliteStatement = {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): unknown;
};

export interface SqliteTestDb {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

type SqliteModule =
  | { new (...args: string[]): SqliteTestDb }
  | { DatabaseSync: new (...args: string[]) => SqliteTestDb };

/** Loads the first runnable SQLite driver: better-sqlite3, then node:sqlite. */
function loadSqliteDriver(): SqliteModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3') as { new (...args: string[]): SqliteTestDb };
    const probe = new Database(':memory:');
    probe.close();
    return Database;
  } catch {
    // better-sqlite3 has no native build for this Node (see db.server); try node:sqlite.
  }
  try {
    const getBuiltinModule = (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule;
    const builtin =
      typeof getBuiltinModule === 'function' ? getBuiltinModule('node:sqlite') : undefined;
    const module = (builtin ??
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('node:sqlite')) as typeof import('node:sqlite');
    const probe = new module.DatabaseSync(':memory:');
    probe.close();
    return module;
  } catch {
    return null;
  }
}

export function sqliteDriversAvailable(): boolean {
  return loadSqliteDriver() !== null;
}

export function createInMemorySqliteDb(): SqliteTestDb {
  const driver = loadSqliteDriver();
  if (!driver) {
    throw new Error('No SQLite driver available (better-sqlite3 or node:sqlite)');
  }
  if ('DatabaseSync' in driver) {
    const db = new driver.DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    return db;
  }
  const db = new driver(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}