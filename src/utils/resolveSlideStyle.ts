import { Deck, Slide, SlideCSS, SlideType } from '../Present/PresentTypes';

/**
 * Merge order: deck.slideStyles[GENERAL] -> deck.slideStyles[slide.type] -> slide.style
 * Shallow merge; later values override earlier keys.
 */
export function resolveSlideStyle(deck?: Deck | null, slide?: Slide | null): SlideCSS {
  const base: SlideCSS = (deck && deck.slideStyles && deck.slideStyles[SlideType.GENERAL]) || {};
  const byType: SlideCSS = (deck && deck.slideStyles && slide && deck.slideStyles[slide.type]) || {};
  const slideStyle: SlideCSS = (slide && slide.style) || {};
  return { ...base, ...byType, ...slideStyle };
}

export default resolveSlideStyle;
