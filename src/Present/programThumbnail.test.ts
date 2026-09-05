import { buildProgramThumbnail } from './programThumbnail';
import { SlideType } from './PresentTypes';

describe('buildProgramThumbnail', () => {
  it('returns null when nothing is on program', () => {
    expect(
      buildProgramThumbnail({
        slide: null,
        message: null,
        songData: null,
        segmentIndex: 0,
        useGreenScreen: false,
      }),
    ).toBeNull();
  });

  it('captures title slide fields for the deck thumbnail', () => {
    const thumb = buildProgramThumbnail({
      slide: {
        type: SlideType.TITLE,
        title: 'Welcome',
        subTitle: 'Sunday',
        style: { backgroundColor: '#112233', color: '#eeeeee' },
      },
      message: null,
      songData: null,
      segmentIndex: 0,
      useGreenScreen: false,
    });
    expect(thumb).toEqual({
      useGreenScreen: false,
      slideType: SlideType.TITLE,
      title: 'Welcome',
      subTitle: 'Sunday',
      backgroundColor: '#112233',
      color: '#eeeeee',
    });
  });

  it('includes the current song lyric pair for the active segment', () => {
    const thumb = buildProgramThumbnail({
      slide: {
        type: SlideType.SONG,
        title: 'Song',
        style: { backgroundColor: '#000', color: '#fff' },
        lyrics: {
          title: 'Song',
          verses: [{ number: 1, lines: ['L1', 'L2', 'L3', 'L4'] }],
        },
      },
      message: null,
      songData: {
        title: 'Song',
        verses: [{ number: 1, lines: ['L1', 'L2', 'L3', 'L4'] }],
      },
      segmentIndex: 1,
      useGreenScreen: false,
    });
    expect(thumb?.lines).toEqual(['L3', 'L4']);
  });
});
