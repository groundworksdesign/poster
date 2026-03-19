# Data Model — Poster Deck + Slides + Songs

## Deck
```ts
type Deck = {
  title: string;
  date: string; // ISO date
  location: string;
  useGreenScreen: boolean;
  notes: string;
  slideStyles: Record<string, SlideCSS>;
  slides: Slide[];
}
```

## Slide
```ts
type Slide = {
  type: SlideType; // 'general' | 'title' | 'song' | 'image' | ...
  title: string;
  subTitle?: string;
  style: SlideCSS; // resolved/persisted per slide
  titleFontSize?: string;
  subTitleFontSize?: string;
  file?: string; // image/audio/video file reference (as URL/relative filename)
  lyrics?: SongData; // only for song slides
}
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

  // background image support (for image slides and/or text overlays)
  backgroundImage?: string; // URL or relative filename
  backgroundSize?: string;
  backgroundPosition?: string;
}
```

## Song data model (input via XML)
```ts
type SongData = {
  title: string;
  author?: string;
  verses: SongVerse[];
}

type SongVerse = {
  number: number;
  lines: string[];
}
```

## Lyrics navigation commands
```ts
type LyricsNavigation =
  | { command: 'next'; timestamp?: number }
  | { command: 'previous'; timestamp?: number }
  | { command: 'goToVerse'; verseIndex: number; timestamp?: number };
```

## Persistence formats
- Song XML: parsed into `SongData` at load time.
- Deck JSON export/import:
  - stores all slide objects and style fields so a deck can be reloaded later with identical visuals.

