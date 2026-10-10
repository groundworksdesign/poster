import {
  embedImageFromFile,
  embedImageFromUrl,
  findExistingEmbeddedImage,
  isDataUrl,
} from './embedImage';

describe('embedImage', () => {
  it('recognizes data URLs', () => {
    expect(isDataUrl('data:image/png;base64,abc')).toBe(true);
    expect(isDataUrl('https://example.com/a.png')).toBe(false);
  });

  it('embeds a local file as a data URL (AC-007)', async () => {
    const file = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    const result = await embedImageFromFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
      expect(result.mimeType).toBe('image/png');
    }
  });

  it('rejects an empty file', async () => {
    const result = await embedImageFromFile(new Blob([]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/empty/i);
  });

  it('returns an existing data URL unchanged', async () => {
    const dataUrl = 'data:image/png;base64,abc';
    const result = await embedImageFromUrl(dataUrl);
    expect(result).toEqual({ ok: true, dataUrl });
  });

  it('embeds a successful URL fetch as a data URL (AC-007)', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const fetchImpl = jest.fn(async () => {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'image/png' },
        blob: async () => new Blob([bytes], { type: 'image/png' }),
      } as any;
    });
    const result = await embedImageFromUrl('https://example.com/bg.png', fetchImpl as any);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    }
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('failed URL leaves an error and no data URL (AC-008)', async () => {
    const fetchImpl = jest.fn(async () => {
      return { ok: false, status: 404, headers: { get: () => null }, blob: async () => new Blob([]) } as any;
    });
    const result = await embedImageFromUrl('https://example.com/missing.png', fetchImpl as any);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Could not download/i);
    }
  });

  it('network failure returns an error (AC-008)', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('Failed to fetch');
    });
    const result = await embedImageFromUrl('https://example.com/bg.png', fetchImpl as any);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Could not download/i);
  });

  it('rejects non-http(s) URLs', async () => {
    const result = await embedImageFromUrl('ftp://example.com/a.png');
    expect(result.ok).toBe(false);
  });

  it('findExistingEmbeddedImage reuses an identical string', () => {
    const a = 'data:image/png;base64,abc';
    expect(findExistingEmbeddedImage(a, [undefined, a, 'other'])).toBe(a);
    expect(findExistingEmbeddedImage('data:x', [a])).toBe('data:x');
  });
});
