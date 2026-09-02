import type { Slide, SongData } from './PresentTypes';
import { SlideType } from './PresentTypes';

/** Compact program snapshot for deck thumbnail (not a full PresentData dump). */
export type ProgramThumbnailState = {
  slideType?: string;
  title?: string;
  subTitle?: string;
  message?: string | null;
  backgroundColor?: string;
  color?: string;
  lines?: string[];
  useGreenScreen?: boolean;
};

/**
 * Build a thumbnail-friendly snapshot of what Present is showing on program.
 */
export function buildProgramThumbnail(input: {
  slide: Slide | null;
  message: string | null;
  songData: SongData | null;
  segmentIndex: number;
  useGreenScreen: boolean;
}): ProgramThumbnailState | null {
  const { slide, message, songData, segmentIndex, useGreenScreen } = input;
  if (!slide && (message === null || message === undefined || message === '')) {
    return null;
  }

  const state: ProgramThumbnailState = {
    useGreenScreen: !!useGreenScreen,
  };

  if (message) {
    state.message = message;
  }

  if (slide) {
    state.slideType = slide.type;
    state.title = slide.title;
    state.subTitle = slide.subTitle;
    state.backgroundColor = useGreenScreen ? 'transparent' : slide.style?.backgroundColor;
    state.color = slide.style?.color;

    if (slide.type === SlideType.SONG && songData) {
      const allLines = songData.verses.flatMap((v) => v.lines);
      const totalSegments = Math.max(1, Math.ceil(allLines.length / 2));
      const seg = Math.max(0, Math.min(segmentIndex, totalSegments - 1));
      const first = allLines[seg * 2] ?? '';
      const second = allLines[seg * 2 + 1] ?? '';
      state.lines = [first, second].filter((line) => line.length > 0);
      if (!state.title && songData.title) {
        state.title = songData.title;
      }
    }
  }

  return state;
}
