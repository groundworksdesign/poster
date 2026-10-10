/**
 * Content-hash asset table so identical background images are stored once
 * per deck (plan risk / Iris N4). Specs may use `embed:<hash>` refs; older
 * decks with inline data URLs still load unchanged.
 */

import type { BackgroundImageSpec, Deck, Slide } from './PresentTypes';

export const EMBED_REF_PREFIX = 'embed:';

/** Sync content hash of a data URL (or any image string). */
export function hashEmbeddedImage(dataUrl: string): string {
  // FNV-1a 32-bit over two seeds — deterministic, sync, no Node/crypto dependency.
  const payload = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ (c + ((i * 131) & 0xff)), 0x811c9dc5);
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    payload.length.toString(16)
  );
}

export function isEmbedRef(image?: string | null): boolean {
  return typeof image === 'string' && image.startsWith(EMBED_REF_PREFIX);
}

export function embedRefForHash(hash: string): string {
  return `${EMBED_REF_PREFIX}${hash}`;
}

export function hashFromEmbedRef(ref: string): string | undefined {
  if (!isEmbedRef(ref)) return undefined;
  return ref.slice(EMBED_REF_PREFIX.length);
}

/** Resolve an embed ref (or pass through inline data/http URLs). */
export function resolveEmbeddedImageRef(
  deck: Deck | null | undefined,
  image?: string | null
): string | undefined {
  if (typeof image !== 'string') return undefined;
  const trimmed = image.trim();
  if (!trimmed) return undefined;
  if (!isEmbedRef(trimmed)) return trimmed;
  const hash = hashFromEmbedRef(trimmed);
  if (!hash) return undefined;
  const stored = deck?.embeddedImages?.[hash];
  return typeof stored === 'string' && stored.trim() ? stored : undefined;
}

/**
 * Store `dataUrl` once in deck.embeddedImages and return an embed ref.
 * If the same bytes are already stored, reuse that hash.
 */
export function internEmbeddedImage(
  deck: Deck,
  dataUrl: string
): { deck: Deck; ref: string } {
  const trimmed = dataUrl.trim();
  const existing = deck.embeddedImages || {};
  for (const [hash, value] of Object.entries(existing)) {
    if (value === trimmed) {
      return { deck, ref: embedRefForHash(hash) };
    }
  }
  const hash = hashEmbeddedImage(trimmed);
  if (existing[hash] === trimmed) {
    return { deck, ref: embedRefForHash(hash) };
  }
  return {
    deck: {
      ...deck,
      embeddedImages: { ...existing, [hash]: trimmed },
    },
    ref: embedRefForHash(hash),
  };
}

/** Intern a background spec's image into the deck asset table. */
export function internBackgroundImageSpec(
  deck: Deck,
  spec: BackgroundImageSpec
): { deck: Deck; spec: BackgroundImageSpec } {
  const image = typeof spec.image === 'string' ? spec.image.trim() : '';
  if (!image) return { deck, spec };
  if (isEmbedRef(image)) return { deck, spec: { ...spec, image } };
  const { deck: nextDeck, ref } = internEmbeddedImage(deck, image);
  return { deck: nextDeck, spec: { ...spec, image: ref } };
}

/** Expand embed refs on a spec for Present payloads / UI preview. */
export function materializeBackgroundImageSpec(
  deck: Deck | null | undefined,
  spec?: BackgroundImageSpec | null
): BackgroundImageSpec | null | undefined {
  if (spec === null) return null;
  if (spec === undefined) return undefined;
  const image = resolveEmbeddedImageRef(deck, spec.image);
  if (image === undefined) {
    return { ...spec, image: typeof spec.image === 'string' ? spec.image : undefined };
  }
  return { ...spec, image };
}

/** Collect every image string currently referenced by the deck (for tests/prune). */
export function listDeckBackgroundImageValues(deck: Deck): string[] {
  const out: string[] = [];
  const push = (spec?: BackgroundImageSpec) => {
    if (typeof spec?.image === 'string' && spec.image.trim()) out.push(spec.image.trim());
  };
  push(deck.defaultBackground);
  push(deck.defaultTitleTextBackground);
  for (const slide of deck.slides || []) {
    push(slide.background);
    push(slide.titleTextBackground);
    if (typeof slide.file === 'string' && slide.file.trim()) out.push(slide.file.trim());
    if (typeof slide.style?.backgroundImage === 'string' && slide.style.backgroundImage.trim()) {
      out.push(slide.style.backgroundImage.trim());
    }
  }
  return out;
}

/** Drop asset-table entries that no slide/default still references. */
export function pruneEmbeddedImages(deck: Deck): Deck {
  const table = deck.embeddedImages;
  if (!table || Object.keys(table).length === 0) return deck;
  const refs = new Set(
    listDeckBackgroundImageValues(deck)
      .filter(isEmbedRef)
      .map((r) => hashFromEmbedRef(r)!)
      .filter(Boolean)
  );
  const next: Record<string, string> = {};
  for (const hash of refs) {
    if (table[hash]) next[hash] = table[hash];
  }
  if (Object.keys(next).length === Object.keys(table).length) return deck;
  const copy: Deck = { ...deck };
  if (Object.keys(next).length === 0) delete copy.embeddedImages;
  else copy.embeddedImages = next;
  return copy;
}

/** Convenience: materialize a slide's background fields for Present send. */
export function materializeSlideBackgrounds(
  deck: Deck | null | undefined,
  slide: Slide
): Slide {
  const next: Slide = { ...slide };
  if (Object.prototype.hasOwnProperty.call(slide, 'background')) {
    next.background = materializeBackgroundImageSpec(deck, slide.background) ?? slide.background;
  }
  if (Object.prototype.hasOwnProperty.call(slide, 'titleTextBackground')) {
    next.titleTextBackground =
      materializeBackgroundImageSpec(deck, slide.titleTextBackground) ?? slide.titleTextBackground;
  }
  return next;
}
