/**
 * Publish embedded background images to /api/poster/asset and rewrite Present
 * payloads to use asset URLs so browser deck-command stays under the JSON body
 * limit (Iris blocker: ~75 KB images → 413).
 */

import type { BackgroundImageSpec } from './PresentTypes';
import { hashEmbeddedImage, isEmbedRef, resolveEmbeddedImageRef } from './embeddedImages';
import type { Deck } from './PresentTypes';

export const PRESENT_ASSET_API_PATH = '/api/poster/asset';

export function presentAssetUrl(hash: string): string {
  return `${PRESENT_ASSET_API_PATH}/${hash}`;
}

export async function publishPresentAsset(
  hash: string,
  dataUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const res = await fetchImpl(PRESENT_ASSET_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ hash, dataUrl }),
  });
  if (!res.ok) {
    throw new Error(`Could not publish present asset (HTTP ${res.status}).`);
  }
  return presentAssetUrl(hash);
}

async function rewriteImageField(
  image: string | undefined,
  deck: Deck | null | undefined,
  fetchImpl: typeof fetch,
  cache: Map<string, string>
): Promise<string | undefined> {
  if (typeof image !== 'string' || !image.trim()) return image;
  const trimmed = image.trim();
  if (trimmed.startsWith(PRESENT_ASSET_API_PATH + '/')) return trimmed;
  const dataUrl = isEmbedRef(trimmed)
    ? resolveEmbeddedImageRef(deck, trimmed)
    : trimmed.startsWith('data:')
      ? trimmed
      : undefined;
  if (!dataUrl || !dataUrl.startsWith('data:')) return trimmed;
  const hash = hashEmbeddedImage(dataUrl);
  if (cache.has(hash)) return cache.get(hash);
  const url = await publishPresentAsset(hash, dataUrl, fetchImpl);
  cache.set(hash, url);
  return url;
}

async function rewriteSpec(
  spec: BackgroundImageSpec | null | undefined,
  deck: Deck | null | undefined,
  fetchImpl: typeof fetch,
  cache: Map<string, string>
): Promise<BackgroundImageSpec | null | undefined> {
  if (spec === null) return null;
  if (spec === undefined) return undefined;
  const image = await rewriteImageField(spec.image, deck, fetchImpl, cache);
  return { ...spec, image };
}

/**
 * Replace data-URL / embed-ref backgrounds in a Present send payload with
 * `/api/poster/asset/<hash>` URLs after publishing bytes to the relay.
 */
export async function prepareHttpPresentPayload(
  payload: Record<string, unknown>,
  deck?: Deck | null,
  fetchImpl: typeof fetch = fetch
): Promise<Record<string, unknown>> {
  const cache = new Map<string, string>();
  const next: Record<string, unknown> = { ...payload };

  if ('defaultBackground' in next) {
    next.defaultBackground = await rewriteSpec(
      next.defaultBackground as BackgroundImageSpec | null | undefined,
      deck,
      fetchImpl,
      cache
    );
  }
  if ('defaultTitleTextBackground' in next) {
    next.defaultTitleTextBackground = await rewriteSpec(
      next.defaultTitleTextBackground as BackgroundImageSpec | null | undefined,
      deck,
      fetchImpl,
      cache
    );
  }
  if (next.slide && typeof next.slide === 'object') {
    const slide = { ...(next.slide as Record<string, unknown>) };
    if ('background' in slide) {
      slide.background = await rewriteSpec(
        slide.background as BackgroundImageSpec | null | undefined,
        deck,
        fetchImpl,
        cache
      );
    }
    if ('titleTextBackground' in slide) {
      slide.titleTextBackground = await rewriteSpec(
        slide.titleTextBackground as BackgroundImageSpec | null | undefined,
        deck,
        fetchImpl,
        cache
      );
    }
    if (typeof slide.file === 'string' && slide.file.startsWith('data:')) {
      slide.file = await rewriteImageField(slide.file, deck, fetchImpl, cache);
    }
    if (slide.style && typeof slide.style === 'object') {
      const style = { ...(slide.style as Record<string, unknown>) };
      if (typeof style.backgroundImage === 'string' && style.backgroundImage.startsWith('data:')) {
        style.backgroundImage = await rewriteImageField(
          style.backgroundImage,
          deck,
          fetchImpl,
          cache
        );
      }
      slide.style = style;
    }
    next.slide = slide;
  }
  return next;
}
