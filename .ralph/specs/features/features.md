# Application Features — Poster Presentation

## Composer (`/deck`)
- **New deck** without importing a file; optional starter slide.
- Load song XML files and deck JSON via file upload.
- When loading XML:
  - parse to `SongData`
  - create a deck with one `SlideType.SONG` slide (single slide model) unless user is building manually
- **Deck defaults UI:** edit `deck.slideStyles` (at least `general` base + optional per-type keys).
- **Per-slide editor:** GENERAL, TITLE, IMAGE, SONG with manual content entry; show **effective** merged style, persist **overrides** in `slide.style`; reset field to deck default.
- Slide management:
  - add blank slides
  - edit fields (title, subTitle, style overrides, lyrics when SONG, image refs when IMAGE)
  - duplicate / delete / reorder (up/down)
- Casting:
  - “Send” pushes resolved slide + optional status (no slide index in normal sends)
  - song navigation sends `lyricsNavigation` commands
  - editing/reordering updates cast when the same slide is live (resend by `id`)
- Save/export: download deck JSON; reload restores state

## Cast (`/presentation`)
- Listen to `BroadcastChannel('presentation')`.
- Render slide with **resolved** style (or trust canonical payload from builder if send-time resolution is chosen — document one approach in architecture).
- Title/general: title + subTitle with **top/middle/bottom** overlay per `verticalAlign`.
- Song: `LyricsDisplay` (2 lines); partial updates must not clear slide/message incorrectly.
- Image: image behind text.
- Green screen: keyed background; avoid opaque slide backgrounds that break keying.

## Lyrics display
- Always show 2 lines at a time.
- Navigation: `next`, `previous`, `goToVerse`.
- Reset segment state when a new `SongData` payload arrives.

## Testing & quality
- Unit tests for parsers, `resolveSlideStyle`, deck helpers.
- Integration tests: builder → cast via fake `BroadcastChannel`.
- Playwright smoke: `/deck` send updates `/presentation`.
- After migration: Playwright `webServer` must start Remix+Vite dev (or built server) per `package.json`.
