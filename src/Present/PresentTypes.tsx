export const enum SlideType {
  GENERAL = 'general',
  TITLE = 'title',
  SONG = 'song',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export const enum HorizontalAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
}

export const enum VerticalAlign {
  TOP = 'top',
  MIDDLE = 'middle',
  BOTTOM = 'bottom',
}

export type SlideCSS = {
  backgroundColor?: string | undefined;
  color?: string | undefined;
  height?: string | undefined;
  width?: string | undefined;
  horizontalAlign?: HorizontalAlign | undefined;
  verticalAlign?: VerticalAlign | undefined;
  fontFamily?: string | undefined;
  fontSize?: string | undefined;
  fontWeight?: string | undefined;
};

export type Slide = {
  type: SlideType;
  title: string;
  subTitle: string | undefined;
  file: string | undefined;
  style: SlideCSS;
  titleFontSize?: string | undefined;
  subTitleFontSize?: string | undefined;
  lyrics?: SongData | undefined;
};

export type SongData = {
  title: string;
  author?: string;
  verses: SongVerse[];
};

export type SongVerse = {
  number: number;
  lines: string[];
};

export type LyricsDisplayState = {
  currentVerse: number;
  currentLineIndex: number;
  isPlaying: boolean;
};

export type PresentDataProps = {
  slide?: Slide | null;
  message?: string | null;
  useGreenScreen?: boolean | null;
};

export class PresentData {
  slide?: Slide | null = null;
  message?: string | null = null;
  useGreenScreen?: boolean | null = null;

  constructor(props: PresentDataProps) {
    if (props.slide) this.slide = props.slide;
    if (props.message) this.message = props.message;
    if (props.useGreenScreen) this.useGreenScreen = props.useGreenScreen;
  }
}

interface StyleDictionary {
  [key: string]: SlideCSS;
}

export type Deck = {
  title: string;
  date: string;
  location: string;
  useGreenScreen: boolean;
  notes: string;
  slideStyles: StyleDictionary;
  slides: Slide[];
};
