import {
  backgroundFitToCss,
  clearSlideBackgroundOverride,
  clearSlideTitleTextBackgroundOverride,
  DEFAULT_BACKGROUND_DIM,
  DEFAULT_BACKGROUND_FIT,
  hasBackgroundImage,
  makeBackgroundImageSpec,
  normalizeBackgroundDim,
  normalizeBackgroundFit,
  resolveTitleTextBackground,
  resolveWholeSlideBackground,
} from './backgroundImage';
import { Deck, Slide, SlideType } from './PresentTypes';

const baseDeck = (over: Partial<Deck> = {}): Deck =>
  ({
    title: 'T',
    date: '',
    location: '',
    useGreenScreen: false,
    notes: '',
    slideStyles: {},
    slides: [],
    ...over,
  }) as Deck;

const baseSlide = (over: Partial<Slide> = {}): Slide =>
  ({
    type: SlideType.GENERAL,
    title: 'S',
    style: {},
    ...over,
  }) as Slide;

describe('backgroundImage defaults', () => {
  it('defaults fit to fill and dim to 0', () => {
    expect(DEFAULT_BACKGROUND_FIT).toBe('fill');
    expect(DEFAULT_BACKGROUND_DIM).toBe(0);
    expect(normalizeBackgroundFit(undefined)).toBe('fill');
    expect(normalizeBackgroundFit('nope')).toBe('fill');
    expect(normalizeBackgroundDim(undefined)).toBe(0);
    expect(normalizeBackgroundDim(-1)).toBe(0);
    expect(normalizeBackgroundDim(2)).toBe(1);
  });

  it('makeBackgroundImageSpec applies fill by default (AC-005)', () => {
    const spec = makeBackgroundImageSpec('data:image/png;base64,abc');
    expect(spec.fit).toBe('fill');
    expect(spec.dim).toBe(0);
    expect(spec.image).toBe('data:image/png;base64,abc');
  });
});

describe('resolveWholeSlideBackground', () => {
  it('older decks with no fields resolve to no image (AC-010)', () => {
    const resolved = resolveWholeSlideBackground(baseDeck(), baseSlide());
    expect(resolved.image).toBeUndefined();
    expect(resolved.isOverride).toBe(false);
    expect(resolved.fit).toBe('fill');
  });

  it('uses the single deck default across slide types (AC-011)', () => {
    const deck = baseDeck({
      defaultBackground: { image: 'data:deck', fit: 'tile', dim: 0.3 },
    });
    for (const type of [
      SlideType.GENERAL,
      SlideType.TITLE,
      SlideType.SONG,
      SlideType.IMAGE,
      SlideType.AUDIO,
      SlideType.VIDEO,
    ]) {
      const resolved = resolveWholeSlideBackground(deck, baseSlide({ type }));
      expect(resolved.image).toBe('data:deck');
      expect(resolved.fit).toBe('tile');
      expect(resolved.dim).toBe(0.3);
      expect(resolved.isOverride).toBe(false);
    }
  });

  it('slide override wins over deck default (AC-003)', () => {
    const deck = baseDeck({
      defaultBackground: { image: 'data:deck', fit: 'fill', dim: 0 },
    });
    const slide = baseSlide({
      background: { image: 'data:slide', fit: 'fit', dim: 0.5 },
    });
    const resolved = resolveWholeSlideBackground(deck, slide);
    expect(resolved.image).toBe('data:slide');
    expect(resolved.fit).toBe('fit');
    expect(resolved.dim).toBe(0.5);
    expect(resolved.isOverride).toBe(true);
  });

  it('override with empty image hides the deck default', () => {
    const deck = baseDeck({
      defaultBackground: { image: 'data:deck' },
    });
    const slide = baseSlide({ background: { image: '' } });
    const resolved = resolveWholeSlideBackground(deck, slide);
    expect(resolved.image).toBeUndefined();
    expect(resolved.isOverride).toBe(true);
  });

  it('Use deck default clears override and restores deck image (AC-003)', () => {
    const deck = baseDeck({
      defaultBackground: { image: 'data:deck', fit: 'fill' },
    });
    const withOverride = baseSlide({
      background: { image: 'data:slide', fit: 'fit' },
    });
    const cleared = clearSlideBackgroundOverride(withOverride);
    expect(Object.prototype.hasOwnProperty.call(cleared, 'background')).toBe(false);
    const resolved = resolveWholeSlideBackground(deck, cleared);
    expect(resolved.image).toBe('data:deck');
    expect(resolved.isOverride).toBe(false);
  });
});

describe('resolveTitleTextBackground', () => {
  it('is separate from whole-slide background (AC-002 data layer)', () => {
    const deck = baseDeck({
      defaultBackground: { image: 'data:whole' },
      defaultTitleTextBackground: { image: 'data:title', fit: 'fit', dim: 0.2 },
    });
    const slide = baseSlide({ type: SlideType.TITLE });
    expect(resolveWholeSlideBackground(deck, slide).image).toBe('data:whole');
    expect(resolveTitleTextBackground(deck, slide).image).toBe('data:title');
    expect(resolveTitleTextBackground(deck, slide).fit).toBe('fit');
  });

  it('supports title-slide override and reset', () => {
    const deck = baseDeck({
      defaultTitleTextBackground: { image: 'data:deck-title' },
    });
    const overridden = baseSlide({
      type: SlideType.TITLE,
      titleTextBackground: { image: 'data:slide-title', dim: 0.4 },
    });
    expect(resolveTitleTextBackground(deck, overridden).image).toBe('data:slide-title');
    const cleared = clearSlideTitleTextBackgroundOverride(overridden);
    expect(resolveTitleTextBackground(deck, cleared).image).toBe('data:deck-title');
  });
});

describe('backgroundFitToCss', () => {
  it('maps fill / fit / tile as named (AC-005)', () => {
    expect(backgroundFitToCss('fill')).toEqual({
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    });
    expect(backgroundFitToCss('fit')).toEqual({
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    });
    expect(backgroundFitToCss('tile')).toEqual({
      backgroundSize: 'auto',
      backgroundRepeat: 'repeat',
      backgroundPosition: 'top left',
    });
  });
});

describe('hasBackgroundImage', () => {
  it('treats whitespace-only as empty', () => {
    expect(hasBackgroundImage({ image: '  ' })).toBe(false);
    expect(hasBackgroundImage({ image: 'data:x' })).toBe(true);
  });
});
