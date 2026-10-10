import type { BackgroundImageSpec, Slide, SlideCSS, SongData } from './PresentTypes';
import { SlideType } from './PresentTypes';
import {
  resolveTitleTextBackground,
  resolveWholeSlideBackground,
  type ResolvedBackgroundImage,
} from './backgroundImage';

/** Compact program snapshot for deck thumbnail (not a full PresentData dump). */
export type ProgramThumbnailState = {
  slideType?: string;
  slideStyle?: SlideCSS;
  slideFile?: string;
  title?: string;
  subTitle?: string;
  titleFontSize?: string;
  subTitleFontSize?: string;
  message?: string | null;
  backgroundColor?: string;
  color?: string;
  lines?: string[];
  useGreenScreen?: boolean;
  /** Resolved whole-slide background (epic-005); kept in green screen. */
  wholeBackground?: ResolvedBackgroundImage;
  /** Resolved title text-layer background (epic-005); kept in green screen. */
  titleTextBackground?: ResolvedBackgroundImage;
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
  defaultBackground?: BackgroundImageSpec;
  defaultTitleTextBackground?: BackgroundImageSpec;
}): ProgramThumbnailState | null {
  const {
    slide,
    message,
    songData,
    segmentIndex,
    useGreenScreen,
    defaultBackground,
    defaultTitleTextBackground,
  } = input;
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
    state.slideStyle = slide.style;
    state.slideFile = slide.file;
    state.title = slide.title;
    state.subTitle = slide.subTitle;
    state.titleFontSize = slide.titleFontSize;
    state.subTitleFontSize = slide.subTitleFontSize;
    state.backgroundColor = useGreenScreen ? 'transparent' : slide.style?.backgroundColor;
    state.color = slide.style?.color;

    const deckProxy = { defaultBackground, defaultTitleTextBackground };
    const whole = resolveWholeSlideBackground(deckProxy as any, slide);
    const titleText = resolveTitleTextBackground(deckProxy as any, slide);
    if (whole.image) state.wholeBackground = whole;
    if (titleText.image && slide.type === SlideType.TITLE) state.titleTextBackground = titleText;

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
