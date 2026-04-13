import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { initSchema } from './schema.server';

export const dbPath = process.env.POSTER_DB_PATH
  ? process.env.POSTER_DB_PATH
  : path.join(process.cwd(), 'poster.sqlite');

function openDb(filePath: string): InstanceType<typeof Database> {
  const database = new Database(filePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  initSchema(database);
  return database;
}

let currentDb = openDb(dbPath);

// Proxy that always delegates to the current db instance so callers
// continue to work after replaceDb() swaps the underlying connection.
const dbProxy = new Proxy({} as InstanceType<typeof Database>, {
  get(_target, prop) {
    const value = (currentDb as any)[prop];
    if (typeof value === 'function') {
      return value.bind(currentDb);
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
  currentDb.close();
  fs.renameSync(newFilePath, dbPath);
  currentDb = openDb(dbPath);
}

export default dbProxy;
