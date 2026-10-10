import {
  BackgroundFit,
  BackgroundImageSpec,
  Deck,
  Slide,
} from './PresentTypes';

/** Default fit for new background images (REQ-006 / AC-005). */
export const DEFAULT_BACKGROUND_FIT: BackgroundFit = 'fill';

/** Default dim level: no darkening. */
export const DEFAULT_BACKGROUND_DIM = 0;

export type ResolvedBackgroundImage = {
  /** Embedded image src, or undefined when no image is active. */
  image?: string;
  fit: BackgroundFit;
  /** Clamped to [0, 1]. */
  dim: number;
  /** True when the slide owns an override (not inheriting the deck default). */
  isOverride: boolean;
};

const FIT_VALUES: ReadonlySet<string> = new Set(['fill', 'fit', 'tile']);

export function normalizeBackgroundFit(fit?: string | null): BackgroundFit {
  if (fit && FIT_VALUES.has(fit)) return fit as BackgroundFit;
  return DEFAULT_BACKGROUND_FIT;
}

export function normalizeBackgroundDim(dim?: number | null): number {
  if (typeof dim !== 'number' || Number.isNaN(dim)) return DEFAULT_BACKGROUND_DIM;
  if (dim < 0) return 0;
  if (dim > 1) return 1;
  return dim;
}

export function hasBackgroundImage(spec?: BackgroundImageSpec | null): boolean {
  return typeof spec?.image === 'string' && spec.image.trim().length > 0;
}

/**
 * Resolve the effective background layer.
 * - Slide override present (owning key) → use slide spec (even if image empty).
 * - Otherwise → use deck default.
 * Older decks with neither field resolve to no image (same look as before).
 */
export function resolveBackgroundLayer(
  deckDefault?: BackgroundImageSpec | null,
  slideOverride?: BackgroundImageSpec | null,
  slideHasOverrideKey?: boolean
): ResolvedBackgroundImage {
  const isOverride = Boolean(slideHasOverrideKey);
  const active = isOverride ? slideOverride ?? {} : deckDefault ?? undefined;
  if (!active || !hasBackgroundImage(active)) {
    return {
      image: undefined,
      fit: normalizeBackgroundFit(active?.fit),
      dim: normalizeBackgroundDim(active?.dim),
      isOverride,
    };
  }
  return {
    image: active.image!.trim(),
    fit: normalizeBackgroundFit(active.fit),
    dim: normalizeBackgroundDim(active.dim),
    isOverride,
  };
}

/** Whole-slide background: deck.defaultBackground vs slide.background. */
export function resolveWholeSlideBackground(
  deck?: Deck | null,
  slide?: Slide | null
): ResolvedBackgroundImage {
  const slideHasOverride = Boolean(slide && Object.prototype.hasOwnProperty.call(slide, 'background'));
  return resolveBackgroundLayer(
    deck?.defaultBackground,
    slide?.background,
    slideHasOverride
  );
}

/** Title text-layer background: deck.defaultTitleTextBackground vs slide.titleTextBackground. */
export function resolveTitleTextBackground(
  deck?: Deck | null,
  slide?: Slide | null
): ResolvedBackgroundImage {
  const slideHasOverride = Boolean(
    slide && Object.prototype.hasOwnProperty.call(slide, 'titleTextBackground')
  );
  return resolveBackgroundLayer(
    deck?.defaultTitleTextBackground,
    slide?.titleTextBackground,
    slideHasOverride
  );
}

/**
 * Remove a slide override so the slide inherits the deck default again
 * ("Use deck default").
 */
export function clearSlideBackgroundOverride(slide: Slide): Slide {
  if (!Object.prototype.hasOwnProperty.call(slide, 'background')) return slide;
  const next = { ...slide };
  delete next.background;
  return next;
}

export function clearSlideTitleTextBackgroundOverride(slide: Slide): Slide {
  if (!Object.prototype.hasOwnProperty.call(slide, 'titleTextBackground')) return slide;
  const next = { ...slide };
  delete next.titleTextBackground;
  return next;
}

/** Map fit mode to CSS background-size / background-repeat. */
export function backgroundFitToCss(fit: BackgroundFit): {
  backgroundSize: string;
  backgroundRepeat: string;
  backgroundPosition: string;
} {
  switch (fit) {
    case 'fit':
      return {
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      };
    case 'tile':
      return {
        backgroundSize: 'auto',
        backgroundRepeat: 'repeat',
        backgroundPosition: 'top left',
      };
    case 'fill':
    default:
      return {
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      };
  }
}

/**
 * Build a new BackgroundImageSpec with fill default when setting an image.
 * Omitting fit/dim applies the product defaults (fill / 0).
 */
export function makeBackgroundImageSpec(
  image: string,
  options?: { fit?: BackgroundFit; dim?: number }
): BackgroundImageSpec {
  return {
    image,
    fit: normalizeBackgroundFit(options?.fit),
    dim: normalizeBackgroundDim(options?.dim),
  };
}
