import {
  embedRefForHash,
  hashEmbeddedImage,
  internBackgroundImageSpec,
  internEmbeddedImage,
  isEmbedRef,
  materializeBackgroundImageSpec,
  pruneEmbeddedImages,
  resolveEmbeddedImageRef,
} from './embeddedImages';
import type { Deck } from './PresentTypes';

const PNG_A = 'data:image/png;base64,aaa';
const PNG_B = 'data:image/png;base64,bbb';

describe('embeddedImages', () => {
  it('hashes the same data URL deterministically', () => {
    expect(hashEmbeddedImage(PNG_A)).toBe(hashEmbeddedImage(PNG_A));
    expect(hashEmbeddedImage(PNG_A)).not.toBe(hashEmbeddedImage(PNG_B));
  });

  it('interns identical images once and returns embed refs', () => {
    const deck: Deck = {
      title: 'T',
      date: '',
      location: '',
      useGreenScreen: false,
      notes: '',
      slideStyles: {},
      slides: [],
    };
    const first = internEmbeddedImage(deck, PNG_A);
    expect(isEmbedRef(first.ref)).toBe(true);
    expect(Object.keys(first.deck.embeddedImages || {})).toHaveLength(1);
    const second = internEmbeddedImage(first.deck, PNG_A);
    expect(second.ref).toBe(first.ref);
    expect(Object.keys(second.deck.embeddedImages || {})).toHaveLength(1);
    const third = internEmbeddedImage(second.deck, PNG_B);
    expect(third.ref).not.toBe(first.ref);
    expect(Object.keys(third.deck.embeddedImages || {})).toHaveLength(2);
  });

  it('resolves embed refs and leaves inline URLs alone', () => {
    const hash = hashEmbeddedImage(PNG_A);
    const deck: Deck = {
      title: 'T',
      date: '',
      location: '',
      useGreenScreen: false,
      notes: '',
      slideStyles: {},
      slides: [],
      embeddedImages: { [hash]: PNG_A },
    };
    expect(resolveEmbeddedImageRef(deck, embedRefForHash(hash))).toBe(PNG_A);
    expect(resolveEmbeddedImageRef(deck, PNG_B)).toBe(PNG_B);
    expect(resolveEmbeddedImageRef(deck, 'embed:missing')).toBeUndefined();
    // Older decks: inline data URL with no table still resolves.
    expect(resolveEmbeddedImageRef({ ...deck, embeddedImages: undefined }, PNG_A)).toBe(PNG_A);
  });

  it('internBackgroundImageSpec + materialize round-trip', () => {
    let deck: Deck = {
      title: 'T',
      date: '',
      location: '',
      useGreenScreen: false,
      notes: '',
      slideStyles: {},
      slides: [],
    };
    const interned = internBackgroundImageSpec(deck, { image: PNG_A, fit: 'fill', dim: 0.2 });
    deck = interned.deck;
    expect(isEmbedRef(interned.spec.image)).toBe(true);
    const materialized = materializeBackgroundImageSpec(deck, interned.spec);
    expect(materialized?.image).toBe(PNG_A);
    expect(materialized?.fit).toBe('fill');
    expect(materialized?.dim).toBe(0.2);
  });

  it('pruneEmbeddedImages drops unused hashes', () => {
    const hashA = hashEmbeddedImage(PNG_A);
    const hashB = hashEmbeddedImage(PNG_B);
    const deck: Deck = {
      title: 'T',
      date: '',
      location: '',
      useGreenScreen: false,
      notes: '',
      slideStyles: {},
      slides: [{ type: 'general' as any, title: 'S', style: {}, background: { image: embedRefForHash(hashA) } }],
      defaultBackground: { image: embedRefForHash(hashA), fit: 'fill', dim: 0 },
      embeddedImages: { [hashA]: PNG_A, [hashB]: PNG_B },
    };
    const pruned = pruneEmbeddedImages(deck);
    expect(pruned.embeddedImages?.[hashA]).toBe(PNG_A);
    expect(pruned.embeddedImages?.[hashB]).toBeUndefined();
  });
});
