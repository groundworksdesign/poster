import { SlideType, type Deck, type SongData } from './PresentTypes';
import {
  applyLibraryDeleteToDeck,
  applyLibraryEditToDeck,
  countHandEditedLinkedSlides,
  countOutOfDateLinkedSlides,
  isHandEditedLinkedSlide,
  isOutOfDateLinkedSlide,
  linkedSlideStatusLabel,
  linkedSlidesInDeck,
  lyricsFingerprint,
} from './linkedSongUpdate';

const baseLyrics: SongData = {
  title: 'Amazing Grace',
  verses: [{ number: 1, lines: ['Amazing grace how sweet'] }],
};

const editedLyrics: SongData = {
  title: 'Amazing Grace',
  verses: [{ number: 1, lines: ['Hand changed line'] }],
};

const newLibrary: SongData = {
  title: 'Amazing Grace',
  verses: [{ number: 1, lines: ['Library new line'] }],
};

const baseFp = () => lyricsFingerprint(baseLyrics);

function deck(slides: Deck['slides']): Deck {
  return {
    title: 'Sunday',
    date: '',
    location: '',
    useGreenScreen: false,
    notes: '',
    slideStyles: {},
    slides,
  };
}

describe('linkedSongUpdate (AC-010, AC-013, REQ-016)', () => {
  it('fingerprints lyrics for hand-edit detection', () => {
    expect(lyricsFingerprint(baseLyrics)).toBe(lyricsFingerprint({ ...baseLyrics }));
    expect(lyricsFingerprint(baseLyrics)).not.toBe(lyricsFingerprint(editedLyrics));
  });

  it('AC-013: detects hand-edited linked slides vs baseline', () => {
    const clean = {
      type: SlideType.SONG,
      title: 'Amazing Grace',
      style: {},
      lyrics: baseLyrics,
      librarySongId: 's1',
    };
    const hand = {
      type: SlideType.SONG,
      title: 'Amazing Grace',
      style: {},
      lyrics: editedLyrics,
      librarySongId: 's1',
    };
    const legacy = {
      type: SlideType.SONG,
      title: 'Amazing Grace',
      style: {},
      lyrics: editedLyrics,
    };
    expect(isHandEditedLinkedSlide(clean, 's1', baseLyrics)).toBe(false);
    expect(isHandEditedLinkedSlide(hand, 's1', baseLyrics)).toBe(true);
    expect(isHandEditedLinkedSlide(legacy as any, 's1', baseLyrics)).toBe(false);
  });

  it('AC-013: edit updates clean linked slides; skips hand-edited without overwrite', () => {
    const d = deck([
      {
        type: SlideType.SONG,
        title: 'Amazing Grace',
        style: {},
        lyrics: baseLyrics,
        librarySongId: 's1',
      },
      {
        type: SlideType.SONG,
        title: 'Amazing Grace',
        style: {},
        lyrics: editedLyrics,
        librarySongId: 's1',
      },
      {
        type: SlideType.GENERAL,
        title: 'Announcements',
        style: {},
      },
      {
        type: SlideType.SONG,
        title: 'Other',
        style: {},
        lyrics: baseLyrics,
        librarySongId: 'other',
      },
    ]);

    const skipped = applyLibraryEditToDeck(d, 's1', newLibrary, baseLyrics, false);
    expect(skipped.updatedCount).toBe(1);
    expect(skipped.skippedHandEditedCount).toBe(1);
    expect(skipped.deck.slides[0].lyrics?.verses[0].lines[0]).toBe('Library new line');
    expect(skipped.deck.slides[0].librarySongId).toBe('s1');
    expect(skipped.deck.slides[1].lyrics?.verses[0].lines[0]).toBe('Hand changed line');
    expect(skipped.deck.slides[2].title).toBe('Announcements');
    expect(skipped.deck.slides[3].librarySongId).toBe('other');

    const forced = applyLibraryEditToDeck(d, 's1', newLibrary, baseLyrics, true);
    expect(forced.updatedCount).toBe(2);
    expect(forced.skippedHandEditedCount).toBe(0);
    expect(forced.deck.slides[1].lyrics?.verses[0].lines[0]).toBe('Library new line');
  });

  it('REQ-016 / delete: removes linked slides only when applying; hand-edited need overwrite', () => {
    const d = deck([
      {
        type: SlideType.SONG,
        title: 'Amazing Grace',
        style: {},
        lyrics: baseLyrics,
        librarySongId: 's1',
      },
      {
        type: SlideType.SONG,
        title: 'Amazing Grace',
        style: {},
        lyrics: editedLyrics,
        librarySongId: 's1',
      },
      {
        type: SlideType.GENERAL,
        title: 'Stay',
        style: {},
      },
    ]);

    const soft = applyLibraryDeleteToDeck(d, 's1', baseLyrics, false);
    expect(soft.removedCount).toBe(1);
    expect(soft.skippedHandEditedCount).toBe(1);
    expect(soft.deck.slides).toHaveLength(2);
    expect(soft.deck.slides[0].lyrics?.verses[0].lines[0]).toBe('Hand changed line');
    expect(soft.deck.slides[1].title).toBe('Stay');

    const hard = applyLibraryDeleteToDeck(d, 's1', baseLyrics, true);
    expect(hard.removedCount).toBe(2);
    expect(hard.deck.slides.map(s => s.title)).toEqual(['Stay']);
  });

  it('counts hand-edited linked slides in a deck', () => {
    const d = deck([
      {
        type: SlideType.SONG,
        title: 'A',
        style: {},
        lyrics: baseLyrics,
        librarySongId: 's1',
      },
      {
        type: SlideType.SONG,
        title: 'A',
        style: {},
        lyrics: editedLyrics,
        librarySongId: 's1',
      },
    ]);
    expect(countHandEditedLinkedSlides(d, 's1', baseLyrics)).toBe(1);
  });

  it('AC-019: scratch slides (no librarySongId) never appear in linked edit and are never changed', () => {
    const scratch = {
      type: SlideType.SONG,
      title: 'Amazing Grace',
      style: {},
      lyrics: baseLyrics,
    };
    const linked = {
      type: SlideType.SONG,
      title: 'Amazing Grace',
      style: {},
      lyrics: baseLyrics,
      librarySongId: 's1',
    };
    const d = deck([scratch, linked]);
    expect(linkedSlidesInDeck(d, 's1')).toHaveLength(1);
    expect(linkedSlidesInDeck(d, 's1')[0].librarySongId).toBe('s1');

    const result = applyLibraryEditToDeck(d, 's1', newLibrary, baseLyrics, true);
    expect(result.updatedCount).toBe(1);
    expect(result.deck.slides[0].librarySongId).toBeUndefined();
    expect(result.deck.slides[0].lyrics?.verses[0].lines[0]).toBe('Amazing grace how sweet');
    expect(result.deck.slides[1].lyrics?.verses[0].lines[0]).toBe('Library new line');
    expect(result.deck.slides[1].librarySongId).toBe('s1');
  });

  it('AC-019: after Save to library (librarySongId set), former scratch is included in prompts/edit', () => {
    const before = deck([
      {
        type: SlideType.SONG,
        title: 'Amazing Grace',
        style: {},
        lyrics: baseLyrics,
      },
    ]);
    expect(linkedSlidesInDeck(before, 's1')).toHaveLength(0);
    const excluded = applyLibraryEditToDeck(before, 's1', newLibrary, baseLyrics, true);
    expect(excluded.updatedCount).toBe(0);

    const afterLink = deck([
      {
        type: SlideType.SONG,
        title: 'Amazing Grace',
        style: {},
        lyrics: baseLyrics,
        librarySongId: 's1',
        librarySongSyncedFingerprint: baseFp(),
      },
    ]);
    expect(linkedSlidesInDeck(afterLink, 's1')).toHaveLength(1);
    const included = applyLibraryEditToDeck(afterLink, 's1', newLibrary, baseLyrics, true);
    expect(included.updatedCount).toBe(1);
    expect(included.deck.slides[0].lyrics?.verses[0].lines[0]).toBe('Library new line');
    expect(included.deck.slides[0].librarySongSyncedFingerprint).toBe(
      lyricsFingerprint(newLibrary),
    );
  });

  it('out-of-date (skipped prior update) is not labelled edited by hand', () => {
    // Synced to base; still showing base lyrics; library baseline has moved to newLibrary.
    const outOfDate = {
      type: SlideType.SONG,
      title: 'Amazing Grace',
      style: {},
      lyrics: baseLyrics,
      librarySongId: 's1',
      librarySongSyncedFingerprint: baseFp(),
    };
    expect(isOutOfDateLinkedSlide(outOfDate, 's1', newLibrary)).toBe(true);
    expect(isHandEditedLinkedSlide(outOfDate, 's1', newLibrary)).toBe(false);
    expect(linkedSlideStatusLabel(outOfDate, 's1', newLibrary)).toBe(
      'Not updated to the latest library version',
    );
    expect(countOutOfDateLinkedSlides(deck([outOfDate]), 's1', newLibrary)).toBe(1);
    expect(countHandEditedLinkedSlides(deck([outOfDate]), 's1', newLibrary)).toBe(0);
  });

  it('hand-edited label when slide text differs from synced fingerprint', () => {
    const hand = {
      type: SlideType.SONG,
      title: 'Amazing Grace',
      style: {},
      lyrics: editedLyrics,
      librarySongId: 's1',
      librarySongSyncedFingerprint: baseFp(),
    };
    expect(isHandEditedLinkedSlide(hand, 's1', newLibrary)).toBe(true);
    expect(linkedSlideStatusLabel(hand, 's1', newLibrary)).toBe('edited by hand');
  });

  it('both hand-edited and out-of-date → label edited by hand', () => {
    const both = {
      type: SlideType.SONG,
      title: 'Amazing Grace',
      style: {},
      lyrics: editedLyrics,
      librarySongId: 's1',
      librarySongSyncedFingerprint: baseFp(),
    };
    expect(isHandEditedLinkedSlide(both, 's1', newLibrary)).toBe(true);
    expect(isOutOfDateLinkedSlide(both, 's1', newLibrary)).toBe(true);
    expect(linkedSlideStatusLabel(both, 's1', newLibrary)).toBe('edited by hand');
    // out-of-date count excludes hand-edited so the prompt can show both buckets
    expect(countOutOfDateLinkedSlides(deck([both]), 's1', newLibrary)).toBe(0);
    expect(countHandEditedLinkedSlides(deck([both]), 's1', newLibrary)).toBe(1);
  });

  it('skipping overwrite leaves out-of-date slides alone; overwrite updates them', () => {
    const outOfDate = {
      type: SlideType.SONG,
      title: 'Amazing Grace',
      style: {},
      lyrics: baseLyrics,
      librarySongId: 's1',
      librarySongSyncedFingerprint: baseFp(),
    };
    const soft = applyLibraryEditToDeck(deck([outOfDate]), 's1', newLibrary, newLibrary, false);
    expect(soft.updatedCount).toBe(0);
    expect(soft.skippedHandEditedCount).toBe(1);
    expect(soft.deck.slides[0].lyrics?.verses[0].lines[0]).toBe('Amazing grace how sweet');

    const hard = applyLibraryEditToDeck(deck([outOfDate]), 's1', newLibrary, newLibrary, true);
    expect(hard.updatedCount).toBe(1);
    expect(hard.deck.slides[0].lyrics?.verses[0].lines[0]).toBe('Library new line');
    expect(hard.deck.slides[0].librarySongSyncedFingerprint).toBe(lyricsFingerprint(newLibrary));
  });

  it('legacy slides without synced fingerprint still open and use baseline hand-edit check', () => {
    const legacy = {
      type: SlideType.SONG,
      title: 'Amazing Grace',
      style: {},
      lyrics: editedLyrics,
      librarySongId: 's1',
    };
    expect(isOutOfDateLinkedSlide(legacy, 's1', baseLyrics)).toBe(false);
    expect(isHandEditedLinkedSlide(legacy, 's1', baseLyrics)).toBe(true);
    expect(linkedSlideStatusLabel(legacy, 's1', baseLyrics)).toBe('edited by hand');
    const result = applyLibraryEditToDeck(deck([legacy]), 's1', newLibrary, baseLyrics, true);
    expect(result.updatedCount).toBe(1);
    expect(result.deck.slides[0].librarySongSyncedFingerprint).toBe(lyricsFingerprint(newLibrary));
  });
});
