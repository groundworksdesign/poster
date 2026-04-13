import type { ActionFunction } from '@remix-run/node';
import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from '@remix-run/node';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { replaceDb } from '../utils/db.server';

// SQLite file magic header: "SQLite format 3" followed by a null byte
const SQLITE_MAGIC = Buffer.from('SQLite format 3\0');

function isSqliteFile(buffer: Buffer): boolean {
  if (buffer.length < 16) return false;
  return buffer.slice(0, 16).equals(SQLITE_MAGIC);
}

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  let formData: FormData;
  try {
    const handler = unstable_createMemoryUploadHandler({
      maxPartSize: 100 * 1024 * 1024, // 100 MB
    });
    formData = await unstable_parseMultipartFormData(request, handler);
  } catch {
    return json({ error: 'Failed to parse upload' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    return json({ error: 'No file provided' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!isSqliteFile(buffer)) {
    return json({ error: 'File is not a valid SQLite database' }, { status: 400 });
  }

  const tempPath = path.join(os.tmpdir(), `poster-restore-${Date.now()}.sqlite`);
  try {
    fs.writeFileSync(tempPath, buffer);
    replaceDb(tempPath);
  } catch {
    try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    return json({ error: 'Failed to restore database' }, { status: 500 });
  }

  return json({ ok: true });
};

export default function RestoreRoute() {
  return null;
}
