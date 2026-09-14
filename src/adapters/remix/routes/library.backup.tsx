import type { LoaderFunction } from '@remix-run/node';
import fs from 'fs';
import { Readable } from 'stream';
import { dbPath } from '../../persistence/db.server';
import { jsonLibraryPath } from '../../persistence/library-json.server';

export const loader: LoaderFunction = () => {
  if (fs.existsSync(dbPath)) {
    const nodeStream = fs.createReadStream(dbPath);
    const webStream = (Readable as any).toWeb(nodeStream);
    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="poster.sqlite"',
      },
    });
  }

  if (fs.existsSync(jsonLibraryPath)) {
    const nodeStream = fs.createReadStream(jsonLibraryPath);
    const webStream = (Readable as any).toWeb(nodeStream);
    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="poster.library.json"',
      },
    });
  }

  return new Response('No library data found (neither poster.sqlite nor poster.library.json)', { status: 404 });
};

export default function BackupRoute() {
  return null;
}
