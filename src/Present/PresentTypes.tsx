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
  backgroundColor?: string;
  color?: string;
  height?: string;
  width?: string;
  horizontalAlign?: HorizontalAlign;
  verticalAlign?: VerticalAlign;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  // background image support
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
};

export type SongVerse = {
  number: number;
  lines: string[];
};

export type SongData = {
  title: string;
  author?: string;
  verses: SongVerse[];
};

export type Slide = {
  type: SlideType;
  title: string;
  subTitle?: string;
  file?: string;
  style: SlideCSS;
  titleFontSize?: string;
  subTitleFontSize?: string;
  // SongData for SONG slides
  lyrics?: SongData;
  // Optional segment helpers (backwards-compat)
  lines?: string[];
  firstVerse?: number;
  lastVerse?: number;
  segmentIndex?: number;
  totalSegments?: number;
  id?: string;
};

export type PresentDataProps = {
  slide?: Slide | null;
  message?: string | null;
  useGreenScreen?: boolean | null;
  // Arbitrary payload for partial updates (e.g., lyricsNavigation)
  data?: any;
};

export class PresentData {
  slide?: Slide | null = null;
  message?: string | null = null;
  useGreenScreen?: boolean | null = null;
  data?: any = null;

  constructor(props: PresentDataProps) {
    if (props.slide !== undefined) this.slide = props.slide;
    if (props.message !== undefined) this.message = props.message;
    if (props.useGreenScreen !== undefined) this.useGreenScreen = props.useGreenScreen;
    if (props.data !== undefined) this.data = props.data;
  }
}

export type Deck = {
  schemaVersion?: number;
  title: string;
  date: string;
  location: string;
  useGreenScreen: boolean;
  notes: string;
  slideStyles: Record<string, SlideCSS>;
  slides: Slide[];
};

