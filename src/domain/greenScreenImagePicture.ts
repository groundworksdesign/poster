/**
 * Single switch for whether an image-slide's own picture (file / legacy
 * style.backgroundImage) is drawn in green-screen mode when a whole-slide
 * background layer is present.
 *
 * Roy decision (epic-005 Iris): SHOW the picture on top of the background
 * in green screen. Change only this constant if that decision flips again.
 * (Iris2 re-gate complete: fetch-image SSRF, thumbnail scale, Present assets.)
 */
export const SHOW_IMAGE_PICTURE_IN_GREEN_SCREEN = true;
