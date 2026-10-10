import {
  prepareHttpPresentPayload,
  PRESENT_ASSET_API_PATH,
  presentAssetUrl,
} from './presentAssets';
import { hashEmbeddedImage } from './embeddedImages';

const PNG = 'data:image/png;base64,aaaabbbbcccc';

describe('presentAssets', () => {
  it('publishes data URLs and rewrites Present payload fields to asset URLs', async () => {
    const published: Array<{ hash: string; dataUrl: string }> = [];
    const fetchImpl = jest.fn(async (_input: RequestInfo, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}'));
      published.push(body);
      return { ok: true, status: 200, json: async () => ({ ok: true, hash: body.hash }) } as any;
    });

    const payload = await prepareHttpPresentPayload(
      {
        defaultBackground: { image: PNG, fit: 'fill', dim: 0 },
        slide: {
          type: 'general',
          title: 'G',
          style: {},
          background: { image: PNG, fit: 'tile', dim: 0.2 },
        },
      },
      null,
      fetchImpl as any
    );

    const hash = hashEmbeddedImage(PNG);
    expect(published).toHaveLength(1);
    expect(published[0]).toEqual({ hash, dataUrl: PNG });
    expect((payload.defaultBackground as any).image).toBe(presentAssetUrl(hash));
    expect((payload.slide as any).background.image).toBe(presentAssetUrl(hash));
    expect((payload.defaultBackground as any).image.startsWith(PRESENT_ASSET_API_PATH)).toBe(true);
  });

  it('keeps null defaults as null', async () => {
    const fetchImpl = jest.fn();
    const payload = await prepareHttpPresentPayload(
      { defaultBackground: null, defaultTitleTextBackground: null, slide: null },
      null,
      fetchImpl as any
    );
    expect(payload.defaultBackground).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
