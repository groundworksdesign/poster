import fs from 'fs';
import path from 'path';
import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
import { initSchema } from './schema.server';

export const dbPath = process.env.POSTER_DB_PATH
  ? process.env.POSTER_DB_PATH
  : path.join(process.cwd(), 'poster.sqlite');

/** Runtime DB handle: native better-sqlite3 or Node built-in `node:sqlite`. */
export type SqliteDatabaseHandle = BetterSqliteDatabase | import('node:sqlite').DatabaseSync;

function openDbWithBetterSqlite3(filePath: string): BetterSqliteDatabase {
  const Database = require('better-sqlite3') as typeof import('better-sqlite3');
  const database = new Database(filePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  initSchema(database);
  return database;
}

/** Suppresses Node's ExperimentalWarning when first loading/using `node:sqlite`. */
function openNodeSqliteWithoutExperimentalWarning(filePath: string): import('node:sqlite').DatabaseSync {
  const emitWarning = process.emitWarning;
  process.emitWarning = function (warning: unknown, ...args: unknown[]) {
    if (
      typeof warning === 'string' &&
      args[0] === 'ExperimentalWarning' &&
      /sqlite/i.test(warning)
    ) {
      return;
    }
    return (emitWarning as (w: unknown, ...a: unknown[]) => void).apply(process, [warning, ...args]);
  };
  try {
    const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
    const database = new DatabaseSync(filePath);
    database.exec('PRAGMA journal_mode = WAL;');
    database.exec('PRAGMA foreign_keys = ON;');
    initSchema(database);
    return database;
  } finally {
    process.emitWarning = emitWarning;
  }
}

function openDbWithNodeSqlite(filePath: string): import('node:sqlite').DatabaseSync {
  return openNodeSqliteWithoutExperimentalWarning(filePath);
}

/**
 * Prefer `better-sqlite3` (fast native addon). If bindings are missing (e.g. new Node ABI),
 * use Node's built-in `node:sqlite` so `poster.sqlite` still works without a rebuild.
 */
function openDb(filePath: string): SqliteDatabaseHandle {
  try {
    return openDbWithBetterSqlite3(filePath);
  } catch (betterErr: unknown) {
    const msg1 = betterErr instanceof Error ? betterErr.message : String(betterErr);
    try {
      const db = openDbWithNodeSqlite(filePath);
      if (process.env.POSTER_SQLITE_LOG_BACKEND === '1') {
        console.info(
          '[poster] SQLite driver: node:sqlite (better-sqlite3 has no native build for this Node; `pnpm rebuild better-sqlite3` may help on supported versions).',
        );
      }
      return db;
    } catch (nodeErr: unknown) {
      const msg2 = nodeErr instanceof Error ? nodeErr.message : String(nodeErr);
      throw new Error(
        `Cannot open SQLite at ${filePath}. better-sqlite3: ${msg1}. node:sqlite: ${msg2}`,
      );
    }
  }
}

let sqliteDb: SqliteDatabaseHandle | null = null;
/** True after both SQLite backends fail; library routes use poster.library.json instead. */
let sqliteLoadFailed = false;

/**
 * Open SQLite once, or return null if no backend can open the DB (then use poster.library.json).
 */
export function tryGetSqliteDb(): SqliteDatabaseHandle | null {
  if (sqliteLoadFailed) return null;
  if (sqliteDb) return sqliteDb;
  try {
    sqliteDb = openDb(dbPath);
    return sqliteDb;
  } catch (e) {
    sqliteLoadFailed = true;
    console.warn(
      '[poster] SQLite unavailable (better-sqlite3 and node:sqlite both failed) — library uses poster.library.json.',
      e,
    );
    return null;
  }
}

function getDbOrThrow(): SqliteDatabaseHandle {
  const db = tryGetSqliteDb();
  if (!db) {
    throw new Error(
      'SQLite is not available. Library data is stored in poster.library.json when SQLite cannot open.',
    );
  }
  return db;
}

// Proxy that always delegates to the current db instance so callers
// continue to work after replaceDb() swaps the underlying connection.
const dbProxy = new Proxy({} as BetterSqliteDatabase, {
  get(_target, prop) {
    const db = getDbOrThrow();
    const value = (db as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  },
});

/**
 * Atomically replace the live database with a file at newFilePath.
 * Closes the current connection, moves the file into place, then
 * reopens so subsequent queries go to the restored database.
 */
export function replaceDb(newFilePath: string): void {
  const dir = path.dirname(dbPath);
  let candidatePath = newFilePath;
  let copiedTempPath: string | null = null;

  if (path.dirname(newFilePath) !== dir) {
    const localTemp = path.join(dir, `.poster-restore-${Date.now()}.sqlite`);
    fs.copyFileSync(newFilePath, localTemp);
    candidatePath = localTemp;
    copiedTempPath = localTemp;
  }

  try {
    try {
      sqliteDb?.close();
    } catch {
      /* ignore */
    }
    sqliteDb = null;
    sqliteLoadFailed = false;

    try {
      fs.renameSync(candidatePath, dbPath);
    } catch {
      fs.copyFileSync(candidatePath, dbPath);
      try {
        fs.unlinkSync(candidatePath);
      } catch {
        /* ignore */
      }
    }

    sqliteDb = openDb(dbPath);
  } catch (err) {
    try {
      sqliteLoadFailed = false;
      sqliteDb = openDb(dbPath);
    } catch {
      sqliteDb = null;
      sqliteLoadFailed = true;
    }
    throw err;
  } finally {
    if (copiedTempPath) {
      try {
        fs.unlinkSync(copiedTempPath);
      } catch {
        /* ignore */
      }
    }
  }
}

export default dbProxy;
