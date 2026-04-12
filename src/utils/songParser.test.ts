import { parseSongXML, isSongData } from './songParser';

test('parse simple song xml with two verses', async () => {
  const xml = `<?xml version="1.0"?>
  <song>
    <title>Test Song</title>
    <author>Author Name</author>
    <verse number="1">
      <line>Line 1</line>
      <line>Line 2</line>
    </verse>
    <verse number="2">
      <line>Line 3</line>
    </verse>
  </song>`;

  const result = await parseSongXML(xml);
  expect(result.title).toBe('Test Song');
  expect(result.author).toBe('Author Name');
  expect(result.verses.length).toBe(2);
  expect(result.verses[0].lines[0]).toBe('Line 1');
  expect(result.verses[0].lines[1]).toBe('Line 2');
  expect(result.verses[1].lines[0]).toBe('Line 3');
});

describe('isSongData', () => {
  const validSong = {
    title: 'Amazing Grace',
    author: 'John Newton',
    verses: [{ number: 1, lines: ['Line one', 'Line two'] }],
  };

  test('returns true for a valid SongData object', () => {
    expect(isSongData(validSong)).toBe(true);
  });

  test('returns true when author is absent', () => {
    const { author, ...noAuthor } = validSong;
    expect(isSongData(noAuthor)).toBe(true);
  });

  test('returns false for a Deck-shaped object (has slides array)', () => {
    const deck = {
      title: 'My Deck',
      date: '2026-01-01',
      location: '',
      useGreenScreen: false,
      notes: '',
      slideStyles: {},
      slides: [],
    };
    expect(isSongData(deck)).toBe(false);
  });

  test('returns false when verses is missing', () => {
    expect(isSongData({ title: 'No Verses' })).toBe(false);
  });

  test('returns false when verses is an empty array', () => {
    expect(isSongData({ title: 'Empty Verses', verses: [] })).toBe(false);
  });

  test('returns false when first verse has no lines array', () => {
    expect(isSongData({ title: 'Bad Verse', verses: [{ number: 1 }] })).toBe(false);
  });

  test('returns false for null', () => {
    expect(isSongData(null)).toBe(false);
  });

  test('returns false for a plain string', () => {
    expect(isSongData('not an object')).toBe(false);
  });

  test('returns false when title is missing', () => {
    expect(isSongData({ verses: [{ number: 1, lines: ['line'] }] })).toBe(false);
  });
});
