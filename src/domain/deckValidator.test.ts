import { validateDeck } from './deckValidator';

describe('validateDeck', () => {
  const validDeck = {
    title: 'Test Deck',
    slides: [{ type: 'general', title: 'Slide 1' }],
  };

  it('returns null for a valid deck', () => {
    expect(validateDeck(validDeck)).toBeNull();
  });

  it('returns null for a deck with multiple valid slide types', () => {
    const deck = {
      title: 'Multi-type Deck',
      slides: [
        { type: 'general' },
        { type: 'title' },
        { type: 'song' },
        { type: 'image' },
        { type: 'audio' },
        { type: 'video' },
      ],
    };
    expect(validateDeck(deck)).toBeNull();
  });

  it('returns an error when parsed is null', () => {
    expect(validateDeck(null)).toBe("File does not contain a JSON object.");
  });

  it('returns an error when parsed is a string', () => {
    expect(validateDeck("hello")).toBe("File does not contain a JSON object.");
  });

  it('returns an error when parsed is a number', () => {
    expect(validateDeck(42)).toBe("File does not contain a JSON object.");
  });

  it('returns a title error when parsed is an array (arrays lack title)', () => {
    expect(validateDeck([{ type: 'general' }])).toBe("Deck is missing a 'title' field.");
    expect(validateDeck([])).toBe("Deck is missing a 'title' field.");
  });

  it('returns an error when title is missing', () => {
    const deck = { slides: [{ type: 'general' }] };
    expect(validateDeck(deck)).toBe("Deck is missing a 'title' field.");
  });

  it('returns an error when title is an empty string', () => {
    const deck = { title: '', slides: [{ type: 'general' }] };
    expect(validateDeck(deck)).toBe("Deck is missing a 'title' field.");
  });

  it('returns an error when title is whitespace only', () => {
    const deck = { title: '   ', slides: [{ type: 'general' }] };
    expect(validateDeck(deck)).toBe("Deck is missing a 'title' field.");
  });

  it('returns an error when title is a number', () => {
    const deck = { title: 123, slides: [{ type: 'general' }] };
    expect(validateDeck(deck)).toBe("Deck is missing a 'title' field.");
  });

  it('returns an error when slides is missing', () => {
    const deck = { title: 'My Deck' };
    expect(validateDeck(deck)).toBe("Deck is missing a 'slides' array.");
  });

  it('returns an error when slides is not an array', () => {
    const deck = { title: 'My Deck', slides: 'not-an-array' };
    expect(validateDeck(deck)).toBe("Deck is missing a 'slides' array.");
  });

  it('returns an error when slides array is empty', () => {
    const deck = { title: 'My Deck', slides: [] };
    expect(validateDeck(deck)).toBe("Deck 'slides' array is empty.");
  });

  it('returns an error when a slide is not an object', () => {
    const deck = { title: 'My Deck', slides: ['invalid'] };
    expect(validateDeck(deck)).toBe("Slide at index 0 is not an object.");
  });

  it('returns an error when a slide is missing type', () => {
    const deck = { title: 'My Deck', slides: [{ title: 'No type here' }] };
    expect(validateDeck(deck)).toContain("Slide at index 0 is missing a valid 'type'.");
    expect(validateDeck(deck)).toContain("undefined");
  });

  it('returns an error when a slide has an unknown type', () => {
    const deck = { title: 'My Deck', slides: [{ type: 'unicorn' }] };
    const result = validateDeck(deck);
    expect(result).toContain("Slide at index 0 is missing a valid 'type'.");
    expect(result).toContain('"unicorn"');
  });

  it('reports the correct index for a bad slide', () => {
    const deck = {
      title: 'My Deck',
      slides: [{ type: 'general' }, { type: 'bad-type' }],
    };
    const result = validateDeck(deck);
    expect(result).toContain("Slide at index 1");
  });
});
