import fs from 'node:fs';
import path from 'node:path';

/** Durable library filenames the app may write (sqlite preferred, JSON fallback). */
export const LIBRARY_STORE_NAMES = ['poster.sqlite', 'poster.library.json'] as const;

/**
 * True when the library root has either the SQLite DB or the JSON-file fallback.
 * CI/runtime may use JSON when better-sqlite3/native sqlite is unavailable.
 */
export function hasLibraryStore(root: string): boolean {
  return LIBRARY_STORE_NAMES.some((name) => fs.existsSync(path.join(root, name)));
}

/**
 * Non-WAL/SHM files under a library root, sorted — used to prove re-point
 * leaves the old folder intact (no move/delete).
 */
export function listLibraryRootFiles(root: string): string[] {
  return fs
    .readdirSync(root)
    .filter((file) => !/-wal$|-shm$/.test(file))
    .sort();
}
