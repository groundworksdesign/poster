import http from 'node:http';
import type { AddressInfo } from 'node:net';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

export type LocalImageServer = {
  origin: string;
  pngUrl: string;
  missingUrl: string;
  close: () => Promise<void>;
};

/** Tiny HTTP image host for unmocked URL-import e2e (loopback; needs POSTER_ALLOW_LOOPBACK_FETCH=1). */
export async function startLocalImageServer(): Promise<LocalImageServer> {
  const server = http.createServer((req, res) => {
    if (req.url === '/pixel.png') {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': PNG_1X1.length });
      res.end(PNG_1X1);
      return;
    }
    if (req.url === '/missing.png') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('missing');
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${port}`;
  return {
    origin,
    pngUrl: `${origin}/pixel.png`,
    missingUrl: `${origin}/missing.png`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
