import type { PresentData, SongData } from './PresentTypes';
import { SlideType } from './PresentTypes';

/** Apply a PresentData payload to presenter state setters. */
export function applyPresentPayload(
  present: PresentData,
  handlers: {
    setSlide: (slide: Exclude<PresentData['slide'], undefined>) => void;
    setMessage: (message: string | null) => void;
    setUseGreenScreen: (value: boolean) => void;
    setSongData: (data: SongData | null) => void;
    setSegmentIndex: (fn: (i: number) => number) => void;
  },
): void {
  if ((present as any).data && (present as any).data.lyricsNavigation) {
    const nav = (present as any).data.lyricsNavigation;
    const cmd = nav.command;
    if (cmd === 'next') handlers.setSegmentIndex((i) => i + 1);
    else if (cmd === 'previous') handlers.setSegmentIndex((i) => Math.max(0, i - 1));
    else if (cmd === 'goToVerse' && typeof nav.verseIndex === 'number') {
      handlers.setSegmentIndex(nav.verseIndex);
    }
    return;
  }

  // `slide: null` is an explicit program-out command, not an omitted field.
  // Message-only payloads omit `slide` entirely — do not treat that as blank.
  if (present.slide === null) {
    handlers.setSlide(null);
    handlers.setMessage(null);
    handlers.setUseGreenScreen(!!present.useGreenScreen);
    handlers.setSongData(null);
    handlers.setSegmentIndex(() => 0);
  } else if (present.slide) {
    handlers.setSlide(present.slide);
    handlers.setMessage(present.message ?? null);
    handlers.setUseGreenScreen(!!present.useGreenScreen);

    if (present.slide.type === SlideType.SONG && present.slide.lyrics) {
      handlers.setSongData(present.slide.lyrics as SongData);
      handlers.setSegmentIndex(() => 0);
    } else {
      handlers.setSongData(null);
      handlers.setSegmentIndex(() => 0);
    }
  } else if (present.message || present.message === '') {
    handlers.setMessage(present.message);
    if (present.useGreenScreen !== undefined && present.useGreenScreen !== null) {
      handlers.setUseGreenScreen(!!present.useGreenScreen);
    }
  }
}
