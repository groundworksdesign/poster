import { validateDeck } from '../domain/deckValidator';
import {
  resolveTitleTextBackground,
  resolveWholeSlideBackground,
} from '../domain/backgroundImage';
import { SlideType, type Deck } from '../domain/PresentTypes';

const TINY = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('background images save/reload round-trip (AC-007, AC-010, AC-011)', () => {
  it('JSON stringify/parse keeps deck defaults and slide overrides', () => {
    const deck: Deck = {
      schemaVersion: 1,
      title: 'BG Roundtrip',
      date: '2026-10-10',
      location: '',
      useGreenScreen: false,
      notes: '',
      slideStyles: {},
      defaultBackground: { image: TINY, fit: 'fill', dim: 0.3 },
      defaultTitleTextBackground: { image: TINY, fit: 'tile', dim: 0.1 },
      slides: [
        {
          type: SlideType.GENERAL,
          title: 'G',
          style: {},
          background: { image: TINY, fit: 'fit', dim: 0 },
        },
        {
          type: SlideType.TITLE,
          title: 'T',
          style: {},
          titleTextBackground: { image: TINY, fit: 'fill', dim: 0.5 },
        },
      ],
    };

    expect(validateDeck(deck)).toBeNull();
    const reloaded = JSON.parse(JSON.stringify(deck)) as Deck;
    expect(validateDeck(reloaded)).toBeNull();
    expect(reloaded.defaultBackground?.fit).toBe('fill');
    expect(reloaded.defaultTitleTextBackground?.fit).toBe('tile');
    expect(resolveWholeSlideBackground(reloaded, reloaded.slides[0]).fit).toBe('fit');
    expect(resolveTitleTextBackground(reloaded, reloaded.slides[1]).dim).toBe(0.5);
    // Single deck defaults still apply to a slide without override.
    const song = {
      type: SlideType.SONG,
      title: 'S',
      style: {},
      lyrics: { title: 'S', verses: [{ number: 1, lines: ['a', 'b'] }] },
    };
    expect(resolveWholeSlideBackground(reloaded, song as any).image).toBe(TINY);
  });

  it('older decks without background fields still validate and resolve empty', () => {
    const legacy = {
      title: 'Legacy',
      slides: [{ type: 'general', title: 'One', style: { backgroundImage: 'https://old.example/a.jpg' } }],
    };
    expect(validateDeck(legacy)).toBeNull();
    const parsed = JSON.parse(JSON.stringify(legacy));
    expect(resolveWholeSlideBackground(parsed, parsed.slides[0]).image).toBeUndefined();
  });
});
