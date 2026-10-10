/**
 * Shared Present slide-frame geometry for editor previews so fill/fit/tile
 * (including letterbox bars and tile density) match Present.
 */

/** Reference Present viewport used for preview scaling (matches typical program capture). */
export const PRESENT_VIEWPORT = { width: 1280, height: 720 } as const;

/** Non-title slides use this fraction of viewport height (Present NON_TITLE_PROGRAM_HEIGHT). */
export const NON_TITLE_PROGRAM_HEIGHT_RATIO = 0.72;

export type PresentFrameSize = { width: number; height: number };

export function presentSlideFrameSize(isTitleSlide: boolean): PresentFrameSize {
  if (isTitleSlide) {
    return { width: PRESENT_VIEWPORT.width, height: PRESENT_VIEWPORT.height };
  }
  return {
    width: PRESENT_VIEWPORT.width,
    height: Math.round(PRESENT_VIEWPORT.height * NON_TITLE_PROGRAM_HEIGHT_RATIO),
  };
}

/**
 * CSS transform scale that fits a Present frame into a preview box of the given width
 * while preserving the Present frame aspect (letterbox/tile density match).
 */
export function presentFramePreviewScale(previewWidth: number, isTitleSlide: boolean): {
  frame: PresentFrameSize;
  scale: number;
  previewHeight: number;
} {
  const frame = presentSlideFrameSize(isTitleSlide);
  const scale = previewWidth / frame.width;
  return {
    frame,
    scale,
    previewHeight: Math.round(frame.height * scale),
  };
}
