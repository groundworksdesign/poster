import { fetchImageBytesAsDataUrl, MAX_EMBEDDED_IMAGE_BYTES } from './fetchImageBytes';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

/** Fake fetch that ignores CORS (like Node) — jsdom's fetch cannot hit localhost. */
function mockFetch(body: Buffer | string, contentType: string, status = 200): typeof fetch {
  return (async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
      arrayBuffer: async () =>
        body instanceof Buffer
          ? body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
          : new TextEncoder().encode(body).buffer,
    }) as any) as typeof fetch;
}

describe('fetchImageBytesAsDataUrl (server / no-CORS)', () => {
  it('embeds a PNG from a host that sends no Access-Control-Allow-Origin', async () => {
    // No ACAO header — Node/server fetch still succeeds (REQ-008).
    const result = await fetchImageBytesAsDataUrl(
      'http://127.0.0.1:9/logo.png',
      mockFetch(PNG_1X1, 'image/png')
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
      expect(Buffer.from(result.dataUrl.split(',')[1], 'base64').equals(PNG_1X1)).toBe(true);
    }
  });

  it('rejects non-image content types', async () => {
    const result = await fetchImageBytesAsDataUrl(
      'http://127.0.0.1:9/page',
      mockFetch('<html>nope</html>', 'text/html')
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/did not return an image/i);
  });

  it('rejects oversized images', async () => {
    const big = Buffer.alloc(MAX_EMBEDDED_IMAGE_BYTES + 1, 1);
    const result = await fetchImageBytesAsDataUrl(
      'http://127.0.0.1:9/big.png',
      mockFetch(big, 'image/png')
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/too large/i);
  });

  it('rejects HTTP error status', async () => {
    const result = await fetchImageBytesAsDataUrl(
      'http://127.0.0.1:9/missing.png',
      mockFetch('missing', 'text/plain', 404)
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/HTTP 404/);
  });
});
