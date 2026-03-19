# Application Features — Poster Presentation

## Composer (`/deck`)
- Load song XML files (and optionally deck JSON files) via file upload.
- When loading XML:
  - parse to `SongData`
  - create a deck with one `SlideType.SONG` slide (single slide model)
- Provide slide management:
  - add blank slides
  - edit slide fields (title/subTitle/style/lyrics when present)
  - duplicate slides
  - delete slides
  - reorder slides (up/down)
- Provide casting controls:
  - “Send” the currently-selected slide to the cast window
  - song navigation controls send `lyricsNavigation` commands
- Save/export:
  - download the deck JSON (`.json`)
  - reload/import restores deck state

## Cast (`/presentation`)
- Listen to `BroadcastChannel('presentation')`.
- Render the received slide:
  - title/general slides show `slide.title` and `slide.subTitle`
  - song slides render lyrics via `LyricsDisplay` (exactly 2 lines)
  - image slides render image behind text
- Green screen:
  - when `useGreenScreen` is enabled, show keyed green as background
  - avoid opaque backgrounds that prevent keying

## Lyrics display
- Always show 2 lines at a time.
- Navigation:
  - `next`: advance by 2 lines (or next verse when needed)
  - `previous`: go back by 2 lines (or previous verse when needed)
  - `goToVerse`: jump to a verse index
- State correctness:
  - when a new `SongData` payload arrives, reset displayed verse/line to the start

## Testing & quality
- Provide unit tests for parsing and logic.
- Provide integration tests for broadcast-driven casting.
- Provide minimal Playwright smoke coverage for critical flows.

