import type { ActionFunction } from '@remix-run/node';
import {
  json,
  unstable_createFileUploadHandler,
  unstable_parseMultipartFormData,
} from '@remix-run/node';
import fs from 'fs';
import path from 'path';
import { replaceDb, dbPath, tryGetSqliteDb } from '../../persistence/db.server';
import { replaceLibraryFromJsonText } from '../../persistence/library-json.server';

// SQLite file magic header: "SQLite format 3" followed by a null byte
const SQLITE_MAGIC = Buffer.from('SQLite format 3\0');

function isSqliteFile(buffer: Buffer): boolean {
  if (buffer.length < 16) return false;
  return buffer.slice(0, 16).equals(SQLITE_MAGIC);
}

function tryRestoreLibraryJson(buffer: Buffer): { ok: true } | { ok: false; error: string } {
  try {
    const text = buffer.toString('utf8');
    replaceLibraryFromJsonText(text);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON library' };
  }
}

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  let formData: FormData;
  try {
    // Write upload directly to disk in the same directory as the live DB to
    // avoid cross-device rename issues and reduce memory pressure for large files.
    const handler = unstable_createFileUploadHandler({
      directory: path.dirname(dbPath),
      maxPartSize: 200 * 1024 * 1024, // 200 MB per part
    });
    formData = await unstable_parseMultipartFormData(request, handler);
  } catch (e) {
    return json({ error: 'Failed to parse upload' }, { status: 400 });
  }

  const fileEntry = formData.get('file') as any;
  if (!fileEntry) {
    return json({ error: 'No file provided' }, { status: 400 });
  }

  // When using the file upload handler, Remix writes the file to disk and
  // exposes a `filepath` property on the file entry. Fall back to in-memory
  // buffer if not present (defensive).
  const uploadedPath: string | undefined = fileEntry.filepath || fileEntry.path;

  if (!uploadedPath || !fs.existsSync(uploadedPath)) {
    // Defensive: try reading as Buffer (older runtimes or in-memory handler)
    try {
      const arrayBuffer = await (fileEntry as File).arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (!isSqliteFile(buffer)) {
        const jsonAttempt = tryRestoreLibraryJson(buffer);
        if (jsonAttempt.ok) {
          return json({ ok: true, format: 'json' });
        }
        return json(
          { error: `Not a SQLite database. ${jsonAttempt.error}` },
          { status: 400 },
        );
      }
      // Write buffer to a temp file in DB directory
      const tempPath = path.join(path.dirname(dbPath), `poster-restore-${Date.now()}.sqlite`);
      fs.writeFileSync(tempPath, buffer);
      try {
        replaceDb(tempPath);
      } catch (err) {
        try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
        if (!tryGetSqliteDb()) {
          return json(
            { error: 'SQLite native module unavailable; use a poster.library.json export to restore.' },
            { status: 503 },
          );
        }
        return json({ error: 'Failed to restore database' }, { status: 500 });
      }

      return json({ ok: true });
    } catch (err) {
      return json({ error: 'Failed to process uploaded file' }, { status: 400 });
    }
  }

  // Validate the first 16 bytes from the on-disk upload
  try {
    const fd = fs.openSync(uploadedPath, 'r');
    const header = Buffer.alloc(16);
    fs.readSync(fd, header, 0, 16, 0);
    fs.closeSync(fd);

    if (!isSqliteFile(header)) {
      try {
        const body = fs.readFileSync(uploadedPath, 'utf8');
        replaceLibraryFromJsonText(body);
        try { fs.unlinkSync(uploadedPath); } catch { /* ignore */ }
        return json({ ok: true, format: 'json' });
      } catch {
        try { fs.unlinkSync(uploadedPath); } catch { /* ignore */ }
        return json({ error: 'File is not a valid SQLite database or library JSON' }, { status: 400 });
      }
    }
  } catch (err) {
    try { fs.unlinkSync(uploadedPath); } catch { /* ignore */ }
    return json({ error: 'Failed to validate uploaded file' }, { status: 400 });
  }

  // Attempt to atomically replace the DB with the uploaded file
  try {
    replaceDb(uploadedPath);
  } catch (err) {
    try { fs.unlinkSync(uploadedPath); } catch { /* ignore */ }
    if (!tryGetSqliteDb()) {
      return json(
        { error: 'SQLite native module unavailable; use a poster.library.json export to restore.' },
        { status: 503 },
      );
    }
    return json({ error: 'Failed to restore database' }, { status: 500 });
  }

  return json({ ok: true });
};

export default function RestoreRoute() {
  return null;
}
