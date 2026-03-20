# Data Model — Poster Deck + Slides + Songs

## Deck
```ts
type Deck = {
  title: string;
  date: string; // ISO date
  location: string;
  useGreenScreen: boolean;
  notes: string;
  /** Default + per-type SlideCSS. Must include `general` (or agreed base key). */
  slideStyles: Record<string, SlideCSS>;
  slides: Slide[];
};
```

## Slide
```ts
type Slide = {
  id?: string; // should always be present at runtime; stable across edits
  type: SlideType; // 'general' | 'title' | 'song' | 'image' | ...
  title: string;
  subTitle?: string;
  /** Overrides only; merge with deck.slideStyles for display/send */
  style: SlideCSS;
  titleFontSize?: string;
  subTitleFontSize?: string;
  file?: string; // image/audio/video file reference (URL or relative filename)
  lyrics?: SongData; // SONG slides
};
```

## Slide CSS
```ts
type SlideCSS = {
  backgroundColor?: string;
  color?: string;
  height?: string;
  width?: string;
  horizontalAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;

  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
};
```

## Effective CSS
Computed helper (pure):
```ts
function resolveSlideStyle(deck: Deck, slide: Slide): SlideCSS {
  const base = deck.slideStyles?.[SlideType.GENERAL] ?? {};
  const byType = deck.slideStyles?.[slide.type] ?? {};
  return { ...base, ...byType, ...slide.style };
}
```
(Use the actual enum/string key used in persisted JSON — today `general`, `title`, etc.)

## Song data model
```ts
type SongData = {
  title: string;
  author?: string;
  verses: SongVerse[];
};

type SongVerse = {
  number: number;
  lines: string[];
};
```

Input: XML file at load time, or **manual** entry in composer (per active plan).

## Lyrics navigation commands
```ts
type LyricsNavigation =
  | { command: 'next' }
  | { command: 'previous' }
  | { command: 'goToVerse'; verseIndex: number };
```

## Persistence formats
- Song XML: parsed into `SongData` at load time.
- Deck JSON export/import: stores `slideStyles` and slides; overrides live in `slide.style`, defaults in `slideStyles`.
