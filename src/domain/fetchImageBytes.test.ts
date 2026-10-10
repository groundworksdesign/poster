import http from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  fetchImageBytesAsDataUrl,
  MAX_EMBEDDED_IMAGE_BYTES,
  UNIFORM_IMAGE_FETCH_ERROR,
} from './fetchImageBytes';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

function startServer(
  handler: http.RequestListener
): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((r, j) => {
            server.close((err) => (err ? j(err) : r()));
          }),
      });
    });
  });
}

describe('fetchImageBytesAsDataUrl SSRF + streaming', () => {
  const prev = process.env.POSTER_ALLOW_LOOPBACK_FETCH;
  jest.setTimeout(25000);

  afterEach(() => {
    if (prev === undefined) delete process.env.POSTER_ALLOW_LOOPBACK_FETCH;
    else process.env.POSTER_ALLOW_LOOPBACK_FETCH = prev;
  });

  it('rejects loopback targets by default with a uniform error', async () => {
    delete process.env.POSTER_ALLOW_LOOPBACK_FETCH;
    const result = await fetchImageBytesAsDataUrl('http://127.0.0.1/logo.png');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(UNIFORM_IMAGE_FETCH_ERROR);
      expect(result.error).not.toMatch(/ECONNREFUSED|EHOSTUNREACH|connect/i);
    }
  });

  it('rejects metadata and private addresses without connecting', async () => {
    delete process.env.POSTER_ALLOW_LOOPBACK_FETCH;
    for (const url of [
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.1/a.png',
      'http://192.168.1.1/a.png',
      'http://172.16.0.1/a.png',
    ]) {
      const result = await fetchImageBytesAsDataUrl(url);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe(UNIFORM_IMAGE_FETCH_ERROR);
    }
  });

  it('rejects redirect-to-private (even when loopback first hop is allowed for e2e)', async () => {
    process.env.POSTER_ALLOW_LOOPBACK_FETCH = '1';
    const { url, close } = await startServer((req, res) => {
      if (req.url === '/go') {
        res.writeHead(302, { Location: 'http://169.254.169.254/x' });
        res.end();
        return;
      }
      res.writeHead(404);
      res.end();
    });
    try {
      const result = await fetchImageBytesAsDataUrl(`${url}/go`);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe(UNIFORM_IMAGE_FETCH_ERROR);
    } finally {
      await close();
    }
  });

  it('streams and rejects oversized bodies (8 MB cap)', async () => {
    process.env.POSTER_ALLOW_LOOPBACK_FETCH = '1';
    const big = Buffer.alloc(MAX_EMBEDDED_IMAGE_BYTES + 1024, 1);
    const { url, close } = await startServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': big.length });
      res.end(big);
    });
    try {
      const result = await fetchImageBytesAsDataUrl(`${url}/big.png`);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe(UNIFORM_IMAGE_FETCH_ERROR);
    } finally {
      await close();
    }
  });

  it('times out slow responses with a uniform error', async () => {
    process.env.POSTER_ALLOW_LOOPBACK_FETCH = '1';
    const { url, close } = await startServer((_req, _res) => {
      // Never respond.
    });
    try {
      const result = await fetchImageBytesAsDataUrl(`${url}/hang.png`);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(UNIFORM_IMAGE_FETCH_ERROR);
      }
    } finally {
      await close();
    }
  });

  it('embeds a PNG from a local e2e host when loopback fetch is allowed', async () => {
    process.env.POSTER_ALLOW_LOOPBACK_FETCH = '1';
    const { url, close } = await startServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(PNG_1X1);
    });
    try {
      const result = await fetchImageBytesAsDataUrl(`${url}/logo.png`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
        expect(Buffer.from(result.dataUrl.split(',')[1], 'base64').equals(PNG_1X1)).toBe(true);
      }
    } finally {
      await close();
    }
  });

  it('rejects empty URL with the enter-URL message', async () => {
    const result = await fetchImageBytesAsDataUrl('  ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Enter an image URL/i);
  });

  it('exports an 8 MB streaming size cap', () => {
    expect(MAX_EMBEDDED_IMAGE_BYTES).toBe(8 * 1024 * 1024);
  });
});
