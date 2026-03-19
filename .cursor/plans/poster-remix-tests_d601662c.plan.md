---
name: poster-remix-tests
overview: Migrate the 2-window poster app to Remix + Vite while modernizing React form controls, and add a high-coverage unit/integration test suite (Vitest + React Testing Library) plus minimal Playwright smoke tests.
todos:
  - id: remix-vite-setup
    content: Create a Remix app with Vite bundler; port existing `/deck` and `/presentation` routes from `src/Deck/DeckBuilder.tsx` and `src/Present/Present.tsx` into Remix route components.
    status: done
  - id: modern-form-controls
    content: Implement slide editing/compose controls using `react-hook-form` + `zod` schemas for slide shape; replace the raw JSON textarea editing with validated inputs (while still supporting an advanced JSON view for power users if desired).
    status: done
  - id: logic-extraction
    content: Refactor deck operations into pure helpers (move/reorder/add/delete/duplicate, slide serialization/deserialization) to enable high unit test coverage; keep existing `Deck`/`Slide` types from `src/Present/PresentTypes.tsx` (or migrate them into a shared `types` module).
    status: done
  - id: song-xml-flow
    content: "Ensure loading `.xml` song creates the correct slide model: a single `SlideType.SONG` slide with `lyrics: SongData`, and next/previous controls in `/deck` send `lyricsNavigation` updates consumed by `src/Present/LyricsDisplay.tsx` (now migrated)."
    status: done
  - id: presentation-rendering-finish
    content: Finish cast rendering for title/general slides and green-screen mode in `/presentation`; ensure slide background images and alignment fields are honored (if present in saved deck data).
    status: done
  - id: deck-save-load
    content: Implement download/save in the builder route (currently `handleSaveClick` is empty in `src/Deck/DeckBuilder.tsx`) and ensure reload/import round-trips the full deck JSON including `slideStyles` and slide backgrounds.
    status: done
  - id: lyrics-state-reset
    content: Update Lyrics rendering so navigation resets correctly when a new song slide (new `SongData`) is received; add unit tests for the reset behavior.
    status: done
  - id: broadcast-partial-updates
    content: Harden BroadcastChannel event handling so partial updates (e.g., lyricsNavigation commands) do not wipe the current slide/message; add integration tests around the builder->cast pipeline.
    status: done
  - id: unit-tests
    content: Add/expand Vitest unit tests for `songParser` XML variants, LyricsDisplay navigation boundaries, and pure deck helper functions; raise coverage by hitting edge cases.
    status: done
  - id: integration-tests
    content: Add Vitest+RTL integration tests that simulate builder dispatches to a rendered cast component using a fake `BroadcastChannel` implementation.
    status: done
  - id: playwright-smoke
    content: Add minimal Playwright smoke tests validating that sending a slide from `/deck` updates the text on `/presentation`.
    status: done
  - id: coverage-reporting
    content: Configure Vitest coverage reporting and (optionally) enforce a practical threshold; iterate until the suite reaches maximal practical coverage without excessive brittle tests.
    status: done
isProject: false
---

## Approach

We will keep the existing functional behavior (two routes: builder `/deck` and cast `/presentation`, communicating via `BroadcastChannel('presentation')`) while migrating the app shell to **Remix + Vite**. During/after the migration we will refactor the most testable pieces into pure functions/modules, then add a **max-coverage** unit + integration suite.

## Target outcomes

- Composer window (`/deck`) can load song XML, edit/reorder slides, and save/download the deck as JSON.
- Cast window (`/presentation`) renders the current slide (title/general) and song lyrics with **2 lines at a time**, with working next/previous navigation and green-screen behavior.
- Tests: maximal practical coverage for logic modules + robust integration tests for the broadcast pipeline + minimal Playwright smoke tests.
- Modern React controls: slide editing uses `react-hook-form` + `zod` validation (controlled inputs, predictable state, typed schemas).

## Dataflow (unchanged, but hardened)

```mermaid
flowchart LR
  Builder[/deck (Compose/Edit)] -->|Broadcast PresentData(slide/message/useGreenScreen)| Cast[/presentation (Cast)]
  Builder -->|Broadcast PresentData(lyricsNavigation only)| Cast
  Cast --> LyricsDisplay[2-line lyrics]
```



## Key refactors for testability

- Extract deck operations (add/move/delete/duplicate/serialize) into pure helpers.
- Extract broadcast event rules (“partial update” semantics) into deterministic utilities.
- Update `LyricsDisplay` so state resets when the song payload changes.

## Migration plan (Remix + Vite)

- Create a Remix/Vite app skeleton.
- Port routes:
  - Existing `src/Deck/DeckBuilder.tsx` -> Remix route component for `/deck`.
  - Existing `src/Present/Present.tsx` -> Remix route component for `/presentation`.
- Keep `src/utils/songParser.ts` as a logic module.
- Move styling assets to Remix-compatible imports.

## Testing plan (max coverage)

- Unit tests (Vitest): `songParser`, deck pure helpers, Lyrics navigation rules, PresentData partial update rules.
- Integration tests (Vitest + React Testing Library):
  - Mock/fake `BroadcastChannel` to validate builder -> cast updates.
  - Render `/presentation` and assert DOM updates for:
    - title/general slides
    - song lyrics 2-line display + next/prev changes
- E2E smoke tests (Playwright, minimal):
  - Start the dev server, navigate to `/deck` and `/presentation` in two pages.
  - Trigger a send action and assert the cast screen updates.

## Practical coverage tactics

- Make logic code pure and deterministic so it can be hit thoroughly.
- Keep components thin; integration tests cover component wiring.
- Prefer behavior assertions (text/roles) over snapshots to avoid brittleness.
- Add regression tests for previously missing behaviors:
  - song XML loading + 2-line lyrics navigation
  - save/download + reload
  - LyricsDisplay state reset on new song

