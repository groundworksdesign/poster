import type { Deck, Slide, SongData } from './PresentTypes';
import { SlideType } from './PresentTypes';

/** Stable string for comparing song lyrics (hand-edit / sync detection). */
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

function slideLyrics(slide: Slide): SongData {
  return (
    slide.lyrics ?? {
      title: slide.title ?? '',
      verses: [],
    }
  );
}

function syncedFingerprint(slide: Slide): string | undefined {
  const raw = slide.librarySongSyncedFingerprint;
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

/**
 * Real user edit: slide text differs from the lyrics last synced from the library.
 * Legacy slides (no synced fingerprint): differ from baseline (previous behavior).
 */
export function isHandEditedLinkedSlide(
  slide: Slide | null | undefined,
  songId: string,
  baselineLyrics: SongData,
): boolean {
  if (!slide || slide.librarySongId !== songId) return false;
  const slideFp = lyricsFingerprint(slideLyrics(slide));
  const synced = syncedFingerprint(slide);
  if (synced !== undefined) {
    return slideFp !== synced;
  }
  return slideFp !== lyricsFingerprint(baselineLyrics);
}

/**
 * Declined/skipped a library update: last sync fingerprint is behind the current baseline.
 * Independent of hand-edit (a slide can be both).
 */
export function isOutOfDateLinkedSlide(
  slide: Slide | null | undefined,
  songId: string,
  baselineLyrics: SongData,
): boolean {
  if (!slide || slide.librarySongId !== songId) return false;
  const synced = syncedFingerprint(slide);
  if (synced === undefined) return false;
  return synced !== lyricsFingerprint(baselineLyrics);
}

/** Slides that need an extra yes before overwrite/remove. */
export function needsOverwriteConfirmLinkedSlide(
  slide: Slide | null | undefined,
  songId: string,
  baselineLyrics: SongData,
): boolean {
  return (
    isHandEditedLinkedSlide(slide, songId, baselineLyrics) ||
    isOutOfDateLinkedSlide(slide, songId, baselineLyrics)
  );
}

export type LinkedSlideStatusLabel =
  | 'edited by hand'
  | 'Not updated to the latest library version';

/**
 * Prompt label for a linked slide. Hand-edit wins when both apply.
 */
export function linkedSlideStatusLabel(
  slide: Slide | null | undefined,
  songId: string,
  baselineLyrics: SongData,
): LinkedSlideStatusLabel | null {
  if (isHandEditedLinkedSlide(slide, songId, baselineLyrics)) return 'edited by hand';
  if (isOutOfDateLinkedSlide(slide, songId, baselineLyrics)) {
    return 'Not updated to the latest library version';
  }
  return null;
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

export function countOutOfDateLinkedSlides(
  deck: Deck,
  songId: string,
  baselineLyrics: SongData,
): number {
  return linkedSlidesInDeck(deck, songId).filter(
    s =>
      isOutOfDateLinkedSlide(s, songId, baselineLyrics) &&
      !isHandEditedLinkedSlide(s, songId, baselineLyrics),
  ).length;
}

export function countOverwriteConfirmLinkedSlides(
  deck: Deck,
  songId: string,
  baselineLyrics: SongData,
): number {
  return linkedSlidesInDeck(deck, songId).filter(s =>
    needsOverwriteConfirmLinkedSlide(s, songId, baselineLyrics),
  ).length;
}

export type ApplyEditResult = {
  deck: Deck;
  updatedCount: number;
  /** Slides left alone because hand-edited and/or out-of-date (overwrite=false). */
  skippedHandEditedCount: number;
};

function syncedSlideFromLibrary(slide: Slide, songId: string, newLyrics: SongData): Slide {
  const lyrics: SongData = {
    title: newLyrics.title,
    author: newLyrics.author,
    verses: Array.isArray(newLyrics.verses) ? newLyrics.verses : [],
  };
  return {
    ...slide,
    type: SlideType.SONG,
    title: newLyrics.title,
    subTitle: newLyrics.author ? `by ${newLyrics.author}` : undefined,
    lyrics,
    librarySongId: songId,
    librarySongSyncedFingerprint: lyricsFingerprint(lyrics),
  };
}

/** Sync linked slides to new library lyrics; skip hand-edited/out-of-date unless overwrite. */
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
    if (needsOverwriteConfirmLinkedSlide(slide, songId, baselineLyrics) && !overwriteHandEdited) {
      skippedHandEditedCount += 1;
      continue;
    }
    slides[i] = syncedSlideFromLibrary(slide, songId, newLyrics);
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
 * Hand-edited / out-of-date linked slides are kept unless overwriteHandEdited.
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
    if (needsOverwriteConfirmLinkedSlide(slide, songId, baselineLyrics) && !overwriteHandEdited) {
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
