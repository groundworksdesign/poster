import { resolveSlideStyle } from './resolveSlideStyle';
import { SlideType } from './PresentTypes';

describe('resolveSlideStyle', () => {
  it('merges general -> type -> slide.style with overrides', () => {
    const deck: any = {
      slideStyles: {
        [SlideType.GENERAL]: { color: 'red', fontSize: '10px', backgroundColor: 'white' },
        [SlideType.TITLE]: { fontSize: '20px', fontWeight: 'bold' },
      },
    };
    const slide: any = { type: SlideType.TITLE, style: { color: 'blue' } };

    const result = resolveSlideStyle(deck, slide);
    expect(result.color).toBe('blue');
    expect(result.fontSize).toBe('20px');
    expect(result.backgroundColor).toBe('white');
    expect(result.fontWeight).toBe('bold');
  });

  it('handles missing deck gracefully', () => {
    const slide: any = { type: SlideType.GENERAL, style: { color: 'green' } };
    const result = resolveSlideStyle(null, slide);
    expect(result.color).toBe('green');
  });

  it('returns merged defaults when slide.style missing', () => {
    const deck: any = {
      slideStyles: {
        [SlideType.GENERAL]: { color: 'red', fontSize: '12px' },
      },
    };
    const slide: any = { type: SlideType.GENERAL };
    const result = resolveSlideStyle(deck, slide);
    expect(result.color).toBe('red');
    expect(result.fontSize).toBe('12px');
  });
});
