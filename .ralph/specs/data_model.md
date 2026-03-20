# Data Model

Overview of primary types used across the application.

## Deck
- `title`: string
- `date`?: string
- `location`?: string
- `notes`?: string
- `useGreenScreen`: boolean
- **`slideStyles`**: `Record<string, SlideCSS>` — **defaults layer**
  - Must include a base under the **general** slide type key (e.g. `general`) for deck-wide defaults.
  - Optional keys per `SlideType` (e.g. `title`, `song`, `image`) for type-specific defaults.
- `slides`: `Slide[]`

## Slide
- `id`: string (stable; required for reorder/edit/resend sync)
- `type`: SlideType (`title` | `general` | `song` | `image` | …)
- `title`?: string
- `subTitle`?: string
- **`style`**: `SlideCSS` — **per-slide overrides** (may be sparse; unset keys inherit from merged defaults)
- `titleFontSize`?, `subTitleFontSize`? (optional explicit sizes)
- `file`?: string (image/media reference)
- `lyrics`?: `SongData` (SONG slides)

## Effective style (computed, not necessarily persisted)
```
effectiveStyle = shallowMerge(
  deck.slideStyles['general'],
  deck.slideStyles[slide.type],
  slide.style
)
```
Last object wins per property. Implement as `resolveSlideStyle(deck, slide)`.

## SongData
- `title`: string
- `author`?: string
- `verses`: `{ number: number; lines: string[] }[]`

## PresentData (broadcast payload)
- `slide`?: Slide | null (typically with **resolved** `style` at send time, or cast recomputes — pick one and document)
- `message`?: string | null — **not** used for “slide 1 / slide N” on cast for normal sends
- `useGreenScreen`?: boolean
- `data`?: `{ lyricsNavigation?: { command: 'next'|'previous'|'goToVerse'; verseIndex?: number } }` for partial updates

## Persistence
- Deck JSON stores `slideStyles` and per-slide fields including override `style` objects.
- Song XML is parsed at load time into `SongData` on the slide.
