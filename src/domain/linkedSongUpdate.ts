import type { Deck, Slide, SongData } from './PresentTypes';
import { SlideType } from './PresentTypes';

/** Stable string for comparing song lyrics (hand-edit detection). */
export function lyricsFingerprint(lyrics: SongData | null | undefined): string {
  if (!lyrics || typeof lyrics !== 'object') return '';
  const title = (lyrics.title ?? '').trim().toLowerCase();
  const author = (lyrics.author ?? '').trim().toLowerCase();
  const verses = Array.isArray(lyrics.verses)
    ? lyrics.verses.map(v => ({
        number: v?.number ?? 0,
        lines: (v?.lines ?? []).map(l => String(l).trim()),
      }))
    : [];
  return JSON.stringify({ title, author, verses });
}

/**
 * A linked slide is hand-edited when its lyrics differ from the library baseline
 * (the library song content before this edit, or current content before delete).
 */
export function isHandEditedLinkedSlide(
  slide: Slide | null | undefined,
  songId: string,
  baselineLyrics: SongData,
): boolean {
  if (!slide || slide.librarySongId !== songId) return false;
  const slideLyrics = slide.lyrics ?? {
    title: slide.title ?? '',
    verses: [],
  };
  return lyricsFingerprint(slideLyrics) !== lyricsFingerprint(baselineLyrics);
}

export function linkedSlidesInDeck(deck: Deck, songId: string): Slide[] {
  const slides = Array.isArray(deck?.slides) ? deck.slides : [];
  return slides.filter(s => s && s.librarySongId === songId);
}

export function countHandEditedLinkedSlides(
  deck: Deck,
  songId: string,
  baselineLyrics: SongData,
): number {
  return linkedSlidesInDeck(deck, songId).filter(s =>
    isHandEditedLinkedSlide(s, songId, baselineLyrics),
  ).length;
}

export type ApplyEditResult = {
  deck: Deck;
  updatedCount: number;
  skippedHandEditedCount: number;
};

/** Sync linked slides to new library lyrics; skip hand-edited unless overwriteHandEdited. */
export function applyLibraryEditToDeck(
  deck: Deck,
  songId: string,
  newLyrics: SongData,
  baselineLyrics: SongData,
  overwriteHandEdited: boolean,
): ApplyEditResult {
  const slides = Array.isArray(deck.slides) ? deck.slides.slice() : [];
  let updatedCount = 0;
  let skippedHandEditedCount = 0;

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    if (!slide || slide.librarySongId !== songId) continue;
    // Unlinked / other songs untouched (also covers legacy slides without librarySongId).
    if (isHandEditedLinkedSlide(slide, songId, baselineLyrics) && !overwriteHandEdited) {
      skippedHandEditedCount += 1;
      continue;
    }
    const next: Slide = {
      ...slide,
      type: SlideType.SONG,
      title: newLyrics.title,
      subTitle: newLyrics.author ? `by ${newLyrics.author}` : undefined,
      lyrics: {
        title: newLyrics.title,
        author: newLyrics.author,
        verses: Array.isArray(newLyrics.verses) ? newLyrics.verses : [],
      },
      librarySongId: songId,
    };
    slides[i] = next;
    updatedCount += 1;
  }

  return {
    deck: { ...deck, slides },
    updatedCount,
    skippedHandEditedCount,
  };
}

export type ApplyDeleteResult = {
  deck: Deck;
  removedCount: number;
  skippedHandEditedCount: number;
};

/**
 * Remove linked slides for songId from the deck.
 * Hand-edited linked slides are kept unless overwriteHandEdited (user confirmed).
 * Unlinked/legacy slides are never removed.
 */
export function applyLibraryDeleteToDeck(
  deck: Deck,
  songId: string,
  baselineLyrics: SongData,
  overwriteHandEdited: boolean,
): ApplyDeleteResult {
  const slides = Array.isArray(deck.slides) ? deck.slides : [];
  let removedCount = 0;
  let skippedHandEditedCount = 0;
  const next: Slide[] = [];

  for (const slide of slides) {
    if (!slide || slide.librarySongId !== songId) {
      next.push(slide);
      continue;
    }
    if (isHandEditedLinkedSlide(slide, songId, baselineLyrics) && !overwriteHandEdited) {
      skippedHandEditedCount += 1;
      next.push(slide);
      continue;
    }
    removedCount += 1;
  }

  return {
    deck: { ...deck, slides: next },
    removedCount,
    skippedHandEditedCount,
  };
}
