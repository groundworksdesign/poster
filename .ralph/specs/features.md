# Features

This document enumerates the major features the Poster app supports or should support.

- Two-window workflow: `/deck` (composer/editor) and `/presentation` (cast renderer).
- Cross-window communication via `BroadcastChannel('presentation')`.
- **New deck from scratch** without loading a file first; full slide CRUD (add, edit, duplicate, reorder, delete) with stable slide ids.
- **Deck-wide style defaults** in `deck.slideStyles` with **per-slide overrides** in `slide.style`; centralized `resolveSlideStyle(deck, slide)` for send + cast.
- Slide types: TITLE, GENERAL, SONG, IMAGE; manual editing of content where required (including structured song lyrics).
- Song XML import: parse XML into `SongData` and create a `SlideType.SONG` slide containing lyrics payload.
- Lyrics navigation: `next` / `previous` / `goToVerse` as `lyricsNavigation` partial updates.
- Cast UX: **no slide-number banner** on normal send; title band position **top | middle | bottom** per slide.
- Save/load: export and import full deck JSON including `slideStyles`, slide fields, and background image refs.
- Presentation: 2-line lyrics, green-screen support, background images and alignment.
- Pure helpers: deck operations + `resolveSlideStyle` in testable modules.
- Validation: composer forms toward `react-hook-form` + `zod` for slide shapes (incremental adoption OK).
- Testing: Jest + RTL today; integration tests with `FakeBroadcastChannel`; minimal Playwright smoke.
- **Remix + Vite** as target shell (migrate off CRA/webpack); offline/vendor build path documented in `.ralph/AGENT_VENDOR.md`.
