# App Spec — Poster Presentation (two-window)

## Overview
The app provides two independent windows (routes) that work together:
- `/deck`: composer/editor window where the operator builds a “deck” of slides.
- `/presentation`: cast window where the currently-active slide is rendered for a live video/green-screen workflow.

The two windows communicate via `BroadcastChannel('presentation')`.

## Primary user flows
1. Load a song XML file in `/deck`.
   - The app parses the XML into `SongData`.
   - The app creates a `SlideType.SONG` slide containing `lyrics: SongData`.
2. Navigate through song lyrics while casting.
   - `/deck` sends `lyricsNavigation` commands (`next`/`previous`, and optionally `goToVerse`) to `/presentation`.
   - `/presentation` updates the displayed lyrics to show exactly 2 lines at a time.
3. Create/edit slides.
   - Slides can be title/general slides and optionally image slides.
   - Slides can be edited and reordered.
4. Save/export and reload decks.
   - `/deck` supports downloading the whole deck as JSON.
   - The JSON can be reloaded to restore the deck and current slide state.
5. Present with green-screen support.
   - When `Deck.useGreenScreen === true`, the cast background should support external chroma-keying.

## Slide types (minimum required)
- `SlideType.TITLE` / `SlideType.GENERAL`: show large central/bottom text.
- `SlideType.SONG`: show song lyrics using the 2-line lyrics renderer.
- `SlideType.IMAGE`: show an image-based slide background (minimal viable support).

## Rendering requirements
- Slide styles are customizable via `SlideCSS`.
- `horizontalAlign` and `verticalAlign` affect text placement.
- Background images (if used) must appear behind text.
- Green-screen mode:
  - cast window background should be keyed green.
  - slide content should not paint an opaque background that blocks the keyed color.

## Persistence requirements
- Exported deck JSON must include:
  - `deck.title`, `deck.date`, `deck.location`, `deck.notes`, `deck.useGreenScreen`
  - `deck.slideStyles` and `deck.slides` with their per-slide `style`
  - Any background image references stored in slide style fields (e.g. image URL or relative filename)

