import type { LoaderFunction } from '@remix-run/node';
import fs from 'fs';
import { dbPath } from '../utils/db.server';

export const loader: LoaderFunction = () => {
  if (!fs.existsSync(dbPath)) {
    return new Response('Database not found', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(dbPath);
  return new Response(fileBuffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="poster.sqlite"',
      'Content-Length': String(fileBuffer.length),
    },
  });
};

export default function BackupRoute() {
  return null;
}
