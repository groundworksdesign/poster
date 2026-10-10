import {
  embedImageFromFile,
  embedImageFromUrl,
  FETCH_IMAGE_API_PATH,
  findExistingEmbeddedImage,
  isDataUrl,
  isImageFile,
} from './embedImage';

describe('embedImage', () => {
  it('recognizes data URLs', () => {
    expect(isDataUrl('data:image/png;base64,abc')).toBe(true);
    expect(isDataUrl('https://example.com/a.png')).toBe(false);
  });

  it('embeds a local image file as a data URL (AC-007)', async () => {
    const file = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    const result = await embedImageFromFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
      expect(result.mimeType).toBe('image/png');
    }
  });

  it('rejects a non-image file (N5)', async () => {
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    const result = await embedImageFromFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/image file/i);
    expect(isImageFile(file)).toBe(false);
  });

  it('rejects an empty file', async () => {
    const result = await embedImageFromFile(new Blob([], { type: 'image/png' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/empty/i);
  });

  it('returns an existing data URL unchanged', async () => {
    const dataUrl = 'data:image/png;base64,abc';
    const result = await embedImageFromUrl(dataUrl);
    expect(result).toEqual({ ok: true, dataUrl });
  });

  it('posts to the server proxy and embeds the returned data URL', async () => {
    const fetchImpl = jest.fn(async (input: RequestInfo, init?: RequestInit) => {
      expect(String(input)).toBe(FETCH_IMAGE_API_PATH);
      expect(init?.method).toBe('POST');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          dataUrl: 'data:image/png;base64,proxied',
          mimeType: 'image/png',
        }),
      } as any;
    });
    const result = await embedImageFromUrl('https://example.com/bg.png', fetchImpl as any);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.dataUrl).toBe('data:image/png;base64,proxied');
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('failed proxy response returns an error (AC-008)', async () => {
    const fetchImpl = jest.fn(async () => {
      return {
        ok: false,
        status: 400,
        json: async () => ({ ok: false, error: 'Could not download the image (HTTP 404).' }),
      } as any;
    });
    const result = await embedImageFromUrl('https://example.com/missing.png', fetchImpl as any);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Could not download/i);
  });

  it('network failure returns an error', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('Failed to fetch');
    });
    const result = await embedImageFromUrl('https://example.com/bg.png', fetchImpl as any);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Could not download/i);
  });

  it('rejects non-http(s) URLs before calling the proxy', async () => {
    const fetchImpl = jest.fn();
    const result = await embedImageFromUrl('ftp://example.com/a.png', fetchImpl as any);
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('findExistingEmbeddedImage reuses an identical string', () => {
    const a = 'data:image/png;base64,abc';
    expect(findExistingEmbeddedImage(a, [undefined, a, 'other'])).toBe(a);
    expect(findExistingEmbeddedImage('data:x', [a])).toBe('data:x');
  });
});
