import type { LoaderFunction } from '@remix-run/node';
import fs from 'fs';
import { Readable } from 'stream';
import { dbPath } from '../utils/db.server';

export const loader: LoaderFunction = () => {
  if (!fs.existsSync(dbPath)) {
    return new Response('Database not found', { status: 404 });
  }

  const nodeStream = fs.createReadStream(dbPath);
  const webStream = (Readable as any).toWeb(nodeStream);
  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="poster.sqlite"',
    },
  });
};

export default function BackupRoute() {
  return null;
}
