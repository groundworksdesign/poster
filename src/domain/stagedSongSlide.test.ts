import { applyLibraryEditToDeck } from './linkedSongUpdate';
import { buildStagedSongSlide, getSongStageCount } from './stagedSongSlide';
import { SlideType, type Deck, type Slide } from './PresentTypes';

/** AC-011 / REQ-013: title stage, then two lyric lines per stage, then blank end. */
function expectTitleThenTwoLineStages(slide: Slide, expectedPairs: string[][]) {
  const pairCount = expectedPairs.length;
  expect(getSongStageCount(slide)).toBe(pairCount + 2);

  const titleStage = buildStagedSongSlide(slide, 0);
  expect(titleStage.lyrics).toBeUndefined();
  expect(titleStage.title).toBe(slide.title);
  expect(titleStage.librarySongId).toBe(slide.librarySongId);

  for (let i = 0; i < pairCount; i++) {
    const lyricStage = buildStagedSongSlide(slide, i + 1);
    expect(lyricStage.title).toBe('');
    expect(lyricStage.subTitle).toBe('');
    expect(lyricStage.lyrics?.verses[0].lines).toEqual(expectedPairs[i]);
    expect(lyricStage.librarySongId).toBe(slide.librarySongId);
  }

  const end = buildStagedSongSlide(slide, pairCount + 1);
  expect(end.title).toBe('');
  expect(end.subTitle).toBe('');
  expect(end.lyrics).toBeUndefined();
}

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

describe('stagedSongSlide AC-011 / REQ-013 (library-linked + linked-update)', () => {
  it('library-linked song slide still stages title then two lyric lines', () => {
    const linked: Slide = {
      type: SlideType.SONG,
      title: 'Amazing Grace',
      subTitle: 'by Newton',
      style: {},
      librarySongId: 'lib-song-1',
      lyrics: {
        title: 'Amazing Grace',
        author: 'Newton',
        verses: [{ number: 1, lines: ['Amazing grace', 'how sweet', 'the sound', 'that saved'] }],
      },
    };
    expectTitleThenTwoLineStages(linked, [
      ['Amazing grace', 'how sweet'],
      ['the sound', 'that saved'],
    ]);
  });

  it('slide updated via linked-update-decks still stages title then two lyric lines', () => {
    const baseline = {
      title: 'Be Still',
      verses: [{ number: 1, lines: ['old one', 'old two'] }],
    };
    const newLyrics = {
      title: 'Be Still, My Soul',
      author: 'von Schlegel',
      verses: [{ number: 1, lines: ['Be still', 'my soul', 'the Lord', 'is on thy side'] }],
    };
    const deck: Deck = {
      title: 'Sunday',
      date: '',
      location: '',
      notes: '',
      useGreenScreen: false,
      slideStyles: {},
      slides: [
        {
          type: SlideType.SONG,
          title: 'Be Still',
          style: {},
          librarySongId: 'lib-song-2',
          lyrics: baseline,
        },
      ],
    };
    const { deck: updated, updatedCount } = applyLibraryEditToDeck(
      deck,
      'lib-song-2',
      newLyrics,
      baseline,
      false,
    );
    expect(updatedCount).toBe(1);
    const slide = updated.slides[0];
    expect(slide.librarySongId).toBe('lib-song-2');
    expect(slide.title).toBe('Be Still, My Soul');
    expectTitleThenTwoLineStages(slide, [
      ['Be still', 'my soul'],
      ['the Lord', 'is on thy side'],
    ]);
  });
});
