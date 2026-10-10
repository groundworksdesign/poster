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
  // background image support (legacy per-style fields; still read for older decks)
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
};

/** How a background image is sized within its layer. Default is fill. */
export type BackgroundFit = 'fill' | 'fit' | 'tile';

/**
 * One background image layer: embedded src, fit mode, and dim toward black.
 * Used for deck defaults and per-slide overrides (whole-slide and title text-layer).
 */
export type BackgroundImageSpec = {
  /** Embedded image (typically a data URL). Absent or empty means no image. */
  image?: string;
  /** fill | fit | tile. Default fill when omitted. */
  fit?: BackgroundFit;
  /** 0 = no dimming, 1 = fully black. Default 0 when omitted. */
  dim?: number;
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
  /** When set, this slide was added from the song library and stays linked. */
  librarySongId?: string;
  /**
   * Fingerprint of library lyrics when this slide was last synced (linked or updated).
   * Used to distinguish hand-edits from skipped/out-of-date library updates.
   * Absent on older decks — those still validate and open.
   */
  librarySongSyncedFingerprint?: string;
  /**
   * Whole-slide background override for this slide.
   * Absent/undefined = inherit the deck default (Use deck default).
   * Present (including empty image) = slide owns the layer.
   */
  background?: BackgroundImageSpec;
  /**
   * Title text-layer background override (title slides).
   * Absent/undefined = inherit the deck default (Use deck default).
   */
  titleTextBackground?: BackgroundImageSpec;
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
  /** Deck default whole-slide background (for Present resolve). */
  defaultBackground?: BackgroundImageSpec;
  /** Deck default title text-layer background (for Present resolve). */
  defaultTitleTextBackground?: BackgroundImageSpec;
};

export class PresentData {
  slide?: Slide | null;
  message?: string | null = null;
  useGreenScreen?: boolean | null = null;
  data?: any = null;
  defaultBackground?: BackgroundImageSpec;
  defaultTitleTextBackground?: BackgroundImageSpec;

  constructor(props: PresentDataProps) {
    if (props.slide !== undefined) this.slide = props.slide;
    if (props.message !== undefined) this.message = props.message;
    if (props.useGreenScreen !== undefined) this.useGreenScreen = props.useGreenScreen;
    if (props.data !== undefined) this.data = props.data;
    if (props.defaultBackground !== undefined) this.defaultBackground = props.defaultBackground;
    if (props.defaultTitleTextBackground !== undefined) {
      this.defaultTitleTextBackground = props.defaultTitleTextBackground;
    }
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
  /**
   * One whole-slide background default for the entire deck (all slide types).
   * Absent on older decks — those look the same as before.
   */
  defaultBackground?: BackgroundImageSpec;
  /**
   * One title text-layer background default for the entire deck.
   * Absent on older decks — those look the same as before.
   */
  defaultTitleTextBackground?: BackgroundImageSpec;
};

