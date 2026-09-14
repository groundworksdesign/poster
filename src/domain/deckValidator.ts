// Valid slide type string values (mirrors SlideType const enum in PresentTypes.tsx).
// A const enum cannot be iterated at runtime, so the values are listed explicitly here.
const VALID_SLIDE_TYPES = new Set(['general', 'title', 'song', 'image', 'audio', 'video']);

/**
 * Validates that `parsed` has the required shape of a Deck.
 * Returns null on success, or a human-readable error string on failure.
 */
export function validateDeck(parsed: unknown): string | null {
  if (parsed === null || typeof parsed !== 'object') {
    return "File does not contain a JSON object.";
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj['title'] !== 'string' || (obj['title'] as string).trim() === '') {
    return "Deck is missing a 'title' field.";
  }

  if (!Array.isArray(obj['slides'])) {
    return "Deck is missing a 'slides' array.";
  }

  const slides = obj['slides'] as unknown[];

  if (slides.length === 0) {
    return "Deck 'slides' array is empty.";
  }

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    if (slide === null || typeof slide !== 'object') {
      return `Slide at index ${i} is not an object.`;
    }
    const slideObj = slide as Record<string, unknown>;
    const t = slideObj['type'];
    if (typeof t !== 'string' || !VALID_SLIDE_TYPES.has(t)) {
      return `Slide at index ${i} is missing a valid 'type'. Got: ${JSON.stringify(t)}.`;
    }
  }

  return null;
}
