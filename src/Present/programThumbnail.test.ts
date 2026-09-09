import { buildProgramThumbnail } from './programThumbnail';
import { SlideType, VerticalAlign } from './PresentTypes';

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
      slideStyle: { backgroundColor: '#112233', color: '#eeeeee' },
      title: 'Welcome',
      subTitle: 'Sunday',
      titleFontSize: undefined,
      subTitleFontSize: undefined,
      backgroundColor: '#112233',
      color: '#eeeeee',
    });
  });

  it('captures all title and alignment styling used by Present', () => {
      const thumb = buildProgramThumbnail({
        slide: {
          type: SlideType.TITLE,
          title: 'Welcome',
          subTitle: 'Sunday',
          titleFontSize: '48px',
          subTitleFontSize: '24px',
          style: {
            backgroundColor: '#112233',
            color: '#eeeeee',
            verticalAlign: VerticalAlign.BOTTOM,
            fontWeight: 'bold',
          },
        },
        message: null,
        songData: null,
        segmentIndex: 0,
        useGreenScreen: false,
      });

      expect(thumb).toMatchObject({
        titleFontSize: '48px',
        subTitleFontSize: '24px',
        slideStyle: {
          verticalAlign: VerticalAlign.BOTTOM,
          fontWeight: 'bold',
        },
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

  it('keeps message and green-screen state in the program snapshot', () => {
    const thumb = buildProgramThumbnail({
      slide: {
        type: SlideType.GENERAL,
        title: 'Lower third',
        style: { backgroundColor: '#123456', color: '#fff' },
      },
      message: 'Live now',
      songData: null,
      segmentIndex: 0,
      useGreenScreen: true,
    });

    expect(thumb).toMatchObject({
      message: 'Live now',
      useGreenScreen: true,
      backgroundColor: 'transparent',
    });
  });

  it('keeps the active lyric pair aligned with navigation updates', () => {
    const thumb = buildProgramThumbnail({
      slide: {
        type: SlideType.SONG,
        title: 'Song',
        style: { backgroundColor: '#000', color: '#fff' },
        lyrics: {
          title: 'Song',
          verses: [{ number: 1, lines: ['Verse 1 line 1', 'Verse 1 line 2', 'Verse 1 line 3', 'Verse 1 line 4'] }],
        },
      },
      message: 'Now playing',
      songData: {
        title: 'Song',
        verses: [{ number: 1, lines: ['Verse 1 line 1', 'Verse 1 line 2', 'Verse 1 line 3', 'Verse 1 line 4'] }],
      },
      segmentIndex: 1,
      useGreenScreen: false,
    });

    expect(thumb).toMatchObject({
      message: 'Now playing',
      lines: ['Verse 1 line 3', 'Verse 1 line 4'],
    });
  });
});
