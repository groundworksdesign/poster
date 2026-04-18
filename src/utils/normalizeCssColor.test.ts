import { normalizeCssColor } from './normalizeCssColor';

describe('normalizeCssColor', () => {
  it('adds # to bare hex digits', () => {
    expect(normalizeCssColor('ff00aa')).toBe('#ff00aa');
    expect(normalizeCssColor('abc')).toBe('#abc');
  });

  it('leaves rgb and existing # values', () => {
    expect(normalizeCssColor('#112233')).toBe('#112233');
    expect(normalizeCssColor('rgb(1,2,3)')).toBe('rgb(1,2,3)');
  });

  it('trims whitespace', () => {
    expect(normalizeCssColor('  ff0000  ')).toBe('#ff0000');
  });
});
