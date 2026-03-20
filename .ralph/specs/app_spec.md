# App Spec — Poster Presentation (two-window)

## Overview
The app provides two independent windows (routes) that work together:
- `/deck`: composer/editor window where the operator builds a “deck” of slides.
- `/presentation`: cast window where the currently-active slide is rendered for a live video/green-screen workflow.

The two windows communicate via `BroadcastChannel('presentation')`.

**Target runtime:** Remix + Vite (single app shell). Until migration completes, the live bundle may still be CRA (`react-scripts`); specs describe the intended end state.

## Primary user flows
1. **Start from scratch** (no JSON required)
   - Create a new empty deck (or deck with a starter slide).
   - Add, edit, duplicate, reorder, and delete slides with stable `id`s.
2. Load a song XML file in `/deck` (optional).
   - Parse XML into `SongData`.
   - Create a `SlideType.SONG` slide containing `lyrics: SongData` (or allow manual lyrics editing in composer per plan).
3. Navigate through song lyrics while casting.
   - `/deck` sends `lyricsNavigation` commands (`next`/`previous`, and optionally `goToVerse`) to `/presentation`.
   - `/presentation` updates the displayed lyrics to show exactly **2 lines** at a time.
4. **Deck-wide defaults + per-slide overrides**
   - Operator sets default `SlideCSS` (and optional per-type defaults) in `deck.slideStyles`.
   - Each slide stores **overrides** in `slide.style`; effective style is computed by merging: `general` base → type-specific defaults → `slide.style` (shallow override per property).
5. Save/export and reload decks.
   - `/deck` supports downloading the whole deck as JSON.
   - Reload restores deck, `slideStyles`, slides, and references (e.g. background images).
6. Present with green-screen support.
   - When `Deck.useGreenScreen === true`, cast background supports chroma-keying; slide backgrounds must not block the key color.

## Slide types (minimum required)
- `SlideType.TITLE` / `SlideType.GENERAL`: title + optional subtitle.
- `SlideType.SONG`: lyrics via `LyricsDisplay` (2 lines); title/subtitle overlay position follows slide vertical alignment when shown.
- `SlideType.IMAGE`: image behind/around text (background image / file reference).

## Cast / presentation requirements
- **Do not** show slide index / “Presenting slide N” as a prominent top banner (`#message` should not carry slide numbering for normal sends).
- **Title placement:** operator selects **top | middle | bottom** per slide (maps to `SlideCSS.verticalAlign`); title/subtitle render as an overlay consistent with lyrics/image layout.
- `horizontalAlign` affects text alignment.
- Background images appear behind text.
- Green-screen mode: keyed green on cast; content backgrounds transparent where required.

## Persistence requirements
Exported deck JSON must include:
- `deck.title`, `deck.date`, `deck.location`, `deck.notes`, `deck.useGreenScreen`
- `deck.slideStyles` (defaults + type keys) and `deck.slides` with per-slide fields
- Stable `slide.id` values for reorder/edit/resend sync
- Background image references in slide style / `file` as today
