import { SlideType, type Slide, type SongData } from '../Present/PresentTypes';

/**
 * Stages: 0 = title+subtitle; 1..numPairs = lyric pairs (2 lines each);
 * numPairs+1 = blank end; then Advance wraps to 0.
 */
export function getSongStageCount(slide: Slide): number {
  if (slide.type !== SlideType.SONG || !slide.lyrics) return 1;
  const lines = slide.lyrics.verses.flatMap(v => v.lines);
  const numPairs = Math.max(1, Math.ceil(lines.length / 2));
  return numPairs + 2;
}

/**
 * Build the slide payload for a staged song send. Each send replaces what the presenter shows.
 * - stage 0: title + subTitle, no lyrics body
 * - stages 1..numPairs: only lyric lines (2 per stage), title/subTitle cleared
 * - stage numPairs+1: empty (no title, no lyrics)
 */
export function buildStagedSongSlide(baseSlide: Slide, stage: number): Slide {
  const lyrics = baseSlide.lyrics as SongData | undefined;
  if (!lyrics) {
    return { ...baseSlide };
  }

  const allLines = lyrics.verses.flatMap(v => v.lines);
  const numPairs = Math.max(1, Math.ceil(allLines.length / 2));
  const totalStages = numPairs + 2;
  const s = ((stage % totalStages) + totalStages) % totalStages;

  if (s === 0) {
    return {
      ...baseSlide,
      lyrics: undefined,
    };
  }

  const terminalStage = numPairs + 1;
  if (s === terminalStage) {
    return {
      ...baseSlide,
      title: '',
      subTitle: '',
      lyrics: undefined,
    };
  }

  const pairIndex = s - 1;
  const i = pairIndex * 2;
  const pair = allLines.slice(i, i + 2);
  const padded: string[] =
    pair.length === 0 ? ['', ''] : pair.length === 1 ? [pair[0], ''] : [pair[0], pair[1]];

  return {
    ...baseSlide,
    title: '',
    subTitle: '',
    lyrics: {
      title: lyrics.title,
      author: lyrics.author,
      verses: [{ number: pairIndex + 1, lines: padded }],
    },
  };
}
