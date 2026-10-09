import { parseVersesText } from './librarySong';

describe('parseVersesText', () => {
  it('splits blank-line blocks into verses with lines', () => {
    const verses = parseVersesText('Line A\nLine B\n\nLine C');
    expect(verses).toEqual([
      { number: 1, lines: ['Line A', 'Line B'] },
      { number: 2, lines: ['Line C'] },
    ]);
  });

  it('returns empty array for blank input', () => {
    expect(parseVersesText('   \n\n  ')).toEqual([]);
  });
});
