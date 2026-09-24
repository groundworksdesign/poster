/**
 * Font-size precedence (epic-002 / Jack QA).
 *
 * Present and program-thumbnail overlay title/subtitle use:
 *   slide.titleFontSize ?? slide.style?.fontSize
 *   slide.subTitleFontSize ?? slide.style?.fontSize
 *
 * On send, DeckBuilder bakes resolveSlideStyle(deck, slide) into slide.style.
 * Baked per-slide titleFontSize / subTitleFontSize therefore win over GENERAL.
 * createNewDeck must not seed those fields (match addSlide(TITLE)).
 */
import { resolveSlideStyle } from './resolveSlideStyle';
import { SlideType } from './PresentTypes';
import type { Deck, Slide } from './PresentTypes';

/** Same formula as Present.tsx / ProgramThumbnailPanel.tsx. */
function overlayTitleFontSize(slide: {
  titleFontSize?: string;
  style?: { fontSize?: string };
}): string | undefined {
  return slide.titleFontSize ?? slide.style?.fontSize;
}

function overlaySubTitleFontSize(slide: {
  subTitleFontSize?: string;
  style?: { fontSize?: string };
}): string | undefined {
  return slide.subTitleFontSize ?? slide.style?.fontSize;
}

/** Mirrors DeckBuilder safeSlide: resolve style into the slide before send. */
function prepareSentSlide(deck: Deck, slide: Slide): Slide {
  return { ...slide, style: resolveSlideStyle(deck, slide) };
}

function updateGeneralFontSize(deck: Deck, fontSize: string): Deck {
  return {
    ...deck,
    slideStyles: {
      ...(deck.slideStyles || {}),
      [SlideType.GENERAL]: {
        ...((deck.slideStyles && deck.slideStyles[SlideType.GENERAL]) || {}),
        fontSize,
      },
    },
  };
}

/** Seed shape for createNewDeck first TITLE — must not bake title sizes. */
function createNewDeckSeed(): Deck {
  return {
    schemaVersion: 1,
    title: 'New Deck',
    date: '2026-01-01',
    location: '',
    useGreenScreen: false,
    notes: '',
    slideStyles: {
      [SlideType.GENERAL]: {
        backgroundColor: '#000000',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        horizontalAlign: 'center' as any,
        verticalAlign: 'middle' as any,
      },
    },
    slides: [
      {
        type: SlideType.TITLE,
        title: 'Title',
        subTitle: '',
        style: {},
        id: 'seed-title',
      },
    ],
  };
}

/** addSlide(TITLE) shape — never bakes title sizes. */
function addTitleSlide(deck: Deck): Deck {
  const slide: Slide = {
    type: SlideType.TITLE,
    title: 'Title',
    subTitle: '',
    style: {},
    id: 'added-title',
  };
  return { ...deck, slides: [...deck.slides, slide] };
}

function addGeneralSlide(deck: Deck): Deck {
  const slide: Slide = {
    type: SlideType.GENERAL,
    title: 'Slide',
    subTitle: '',
    style: {},
    id: 'added-general',
  };
  return { ...deck, slides: [...deck.slides, slide] };
}

describe('font-size precedence (epic-002)', () => {
  it('createNewDeck seed has no baked titleFontSize / subTitleFontSize', () => {
    const deck = createNewDeckSeed();
    const first = deck.slides[0];
    expect(first.titleFontSize).toBeUndefined();
    expect(first.subTitleFontSize).toBeUndefined();
  });

  it('after createNewDeck, GENERAL fontSize change updates first title overlay', () => {
    let deck = createNewDeckSeed();
    deck = updateGeneralFontSize(deck, '60px');
    const sent = prepareSentSlide(deck, deck.slides[0]);
    expect(sent.style.fontSize).toBe('60px');
    expect(overlayTitleFontSize(sent)).toBe('60px');
    expect(overlaySubTitleFontSize(sent)).toBe('60px');
  });

  it('addSlide(TITLE) overlay follows GENERAL fontSize', () => {
    let deck = createNewDeckSeed();
    deck = addTitleSlide(deck);
    deck = updateGeneralFontSize(deck, '60px');
    const sent = prepareSentSlide(deck, deck.slides[1]);
    expect(sent.titleFontSize).toBeUndefined();
    expect(overlayTitleFontSize(sent)).toBe('60px');
    expect(overlaySubTitleFontSize(sent)).toBe('60px');
  });

  it('non-title GENERAL slide follows GENERAL fontSize', () => {
    let deck = createNewDeckSeed();
    deck = addGeneralSlide(deck);
    deck = updateGeneralFontSize(deck, '60px');
    const sent = prepareSentSlide(deck, deck.slides[1]);
    expect(sent.style.fontSize).toBe('60px');
    // Non-title body uses style.fontSize (no title overlay sizes)
    expect(sent.style.fontSize).toBe(deck.slideStyles![SlideType.GENERAL]!.fontSize);
  });

  it('pre-baked title sizes win over GENERAL and are not cleared on fontSize change', () => {
    let deck = createNewDeckSeed();
    deck = {
      ...deck,
      slides: [
        {
          ...deck.slides[0],
          titleFontSize: '48px',
          subTitleFontSize: '28px',
        },
      ],
    };
    deck = updateGeneralFontSize(deck, '60px');
    const sent = prepareSentSlide(deck, deck.slides[0]);
    expect(sent.style.fontSize).toBe('60px');
    expect(sent.titleFontSize).toBe('48px');
    expect(sent.subTitleFontSize).toBe('28px');
    expect(overlayTitleFontSize(sent)).toBe('48px');
    expect(overlaySubTitleFontSize(sent)).toBe('28px');
  });

  it('second GENERAL change: baked first title stays; unbaked added TITLE follows', () => {
    let deck = createNewDeckSeed();
    deck = {
      ...deck,
      slides: [
        {
          ...deck.slides[0],
          titleFontSize: '48px',
          subTitleFontSize: '28px',
        },
      ],
    };
    deck = addTitleSlide(deck);
    deck = updateGeneralFontSize(deck, '18px');

    const baked = prepareSentSlide(deck, deck.slides[0]);
    const added = prepareSentSlide(deck, deck.slides[1]);

    expect(overlayTitleFontSize(baked)).toBe('48px');
    expect(overlayTitleFontSize(added)).toBe('18px');
  });

  it('regression: baking 48px/28px on createNewDeck seed would break Font size control', () => {
    // Documents Jack's failing case — if createNewDeck again seeds these, first title ignores GENERAL.
    let deck = createNewDeckSeed();
    deck = {
      ...deck,
      slides: [
        {
          ...deck.slides[0],
          titleFontSize: '48px',
          subTitleFontSize: '28px',
        },
      ],
    };
    deck = updateGeneralFontSize(deck, '60px');
    const sent = prepareSentSlide(deck, deck.slides[0]);
    expect(overlayTitleFontSize(sent)).toBe('48px');
    expect(overlaySubTitleFontSize(sent)).toBe('28px');
    // Contrasts with the correct seed (no bake) which follows GENERAL:
    const good = prepareSentSlide(createNewDeckSeed(), createNewDeckSeed().slides[0]);
    const goodUpdated = prepareSentSlide(
      updateGeneralFontSize(createNewDeckSeed(), '60px'),
      createNewDeckSeed().slides[0],
    );
    expect(overlayTitleFontSize(good)).toBe('24px');
    expect(overlayTitleFontSize(goodUpdated)).toBe('60px');
  });
});
