import { buildStagedSongSlide, getSongStageCount } from './stagedSongSlide';
import { SlideType } from './PresentTypes';

describe('stagedSongSlide', () => {
  const base: Parameters<typeof buildStagedSongSlide>[0] = {
    type: SlideType.SONG,
    title: 'Hymn',
    subTitle: 'vs 1',
    style: {},
    lyrics: {
      title: 'Hymn',
      verses: [{ number: 1, lines: ['a', 'b', 'c', 'd'] }],
    },
  };

  it('getSongStageCount is title + pairs + blank end', () => {
    expect(getSongStageCount(base)).toBe(2 + 2);
  });

  it('stage 0 drops lyrics, keeps title', () => {
    const s = buildStagedSongSlide(base, 0);
    expect(s.lyrics).toBeUndefined();
    expect(s.title).toBe('Hymn');
    expect(s.subTitle).toBe('vs 1');
  });

  it('stage 1 clears title and sends first pair', () => {
    const s = buildStagedSongSlide(base, 1);
    expect(s.title).toBe('');
    expect(s.subTitle).toBe('');
    expect(s.lyrics?.verses[0].lines).toEqual(['a', 'b']);
  });

  it('stage 2 sends second pair', () => {
    const s = buildStagedSongSlide(base, 2);
    expect(s.lyrics?.verses[0].lines).toEqual(['c', 'd']);
  });

  it('final stage clears title and lyrics', () => {
    const s = buildStagedSongSlide(base, 3);
    expect(s.title).toBe('');
    expect(s.subTitle).toBe('');
    expect(s.lyrics).toBeUndefined();
  });
});
