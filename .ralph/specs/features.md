# Features

This document enumerates the major features the Poster app supports or should support.

- Two-window workflow: `/deck` (composer/editor) and `/presentation` (cast renderer).
- Cross-window communication via BroadcastChannel('presentation').
- Slide types: TITLE, GENERAL, SONG, IMAGE.
- Song XML import: parse XML into SongData and create a single SlideType.SONG slide containing lyrics payload.
- Lyrics navigation: next/previous and goToVerse commands sent as `lyricsNavigation` partial updates.
- Deck editing: add, edit, duplicate, move/reorder, delete slides with stable slide ids.
- Save/load: export and import full deck JSON including `slideStyles`, slide `style` and background image refs.
- Presentation features: 2-line lyrics rendering, green-screen support, background images and alignment controls.
- Pure helpers: deck operations (add/move/delete/duplicate) and serialization/deserialization extracted into testable modules.
- Validation: composer forms use `react-hook-form` + `zod` schemas for slide shapes.
- Testing: unit tests (Vitest), integration tests (RTL with FakeBroadcastChannel), minimal Playwright smoke tests.
- Offline build support: vendorized runtime and prebuilt `/build` artifacts for CI/offline environments.
