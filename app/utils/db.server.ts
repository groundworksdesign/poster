import fs from 'fs';
import path from 'path';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import { initSchema } from './schema.server';

export const dbPath = process.env.POSTER_DB_PATH
  ? process.env.POSTER_DB_PATH
  : path.join(process.cwd(), 'poster.sqlite');

function openDb(filePath: string): SqliteDatabase {
  // Require here so `better-sqlite3` native bindings load only when the DB is used,
  // not when this module is imported by unrelated routes.
  const Database = require('better-sqlite3') as typeof import('better-sqlite3');
  const database = new Database(filePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  initSchema(database);
  return database;
}

let currentDb: SqliteDatabase | null = null;

function getDb(): SqliteDatabase {
  if (!currentDb) {
    currentDb = openDb(dbPath);
  }
  return currentDb;
}

// Proxy that always delegates to the current db instance so callers
// continue to work after replaceDb() swaps the underlying connection.
const dbProxy = new Proxy({} as SqliteDatabase, {
  get(_target, prop) {
    const db = getDb();
    const value = (db as any)[prop];
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

  // If the uploaded file isn't in the same directory as the live DB, copy it into the DB directory
  // so subsequent rename operations are on the same filesystem and less likely to fail with EXDEV.
  if (path.dirname(newFilePath) !== dir) {
    const localTemp = path.join(dir, `.poster-restore-${Date.now()}.sqlite`);
    fs.copyFileSync(newFilePath, localTemp);
    candidatePath = localTemp;
    copiedTempPath = localTemp;
  }

  // Attempt to close the current DB, replace the file, and reopen.
  try {
    try {
      currentDb?.close();
    } catch (closeErr) {
      // ignore close errors
    }
    currentDb = null;

    try {
      fs.renameSync(candidatePath, dbPath);
    } catch (renameErr) {
      // Fallback: copy then unlink if rename fails (e.g., cross-device)
      fs.copyFileSync(candidatePath, dbPath);
      try { fs.unlinkSync(candidatePath); } catch { /* ignore */ }
    }

    currentDb = openDb(dbPath);
  } catch (err) {
    // If anything fails, attempt to reopen the original DB to leave the server usable
    try {
      currentDb = openDb(dbPath);
    } catch (reopenErr) {
      // nothing sensible to do; rethrow the original error
    }
    throw err;
  } finally {
    // cleanup any temporary copied file
    if (copiedTempPath) {
      try { fs.unlinkSync(copiedTempPath); } catch { /* ignore */ }
    }
  }
}

export default dbProxy;
