# Fix Plan / TODO List (poster)

This file is the single source of truth for the next prioritized work items.
Ralph loop should pick the next highest-priority item and mark it completed.

## ✅ Iteration: create poster specs/tasks artifacts (completed)

- [x] Rewired `.ralph` loop prompts/config (`.ralph/config.json`, `.ralph/ralph.sh`, `.ralph/PROMPT.md`, `.ralph/AGENT.md`, `.ralph/PLAN_PROMPT.md`)
- [x] Generated poster-specific specs under `.ralph/specs/*` (`app_spec`, `features`, `data_model`, `architecture`)
- [x] Created poster-specific execution plans under `.ralph/session-plan.md`
- [x] Updated loop prompt to ingest `.cursor/plans/poster-remix-tests_d601662c.plan.md`

## Priority 1 — Core app migration + behavior parity

1. [x] `remix-vite-setup`: Scaffold Remix + Vite and port `/deck` + `/presentation` routes. (scaffolded under /app with route components copied; full Remix/Vite install & run pending environment)
2. [x] `song-xml-flow`: Ensure loading a `.xml` song produces a *single* `SlideType.SONG` slide with `lyrics: SongData`, and that `/deck` next/prev controls send `lyricsNavigation` commands consumed by `LyricsDisplay`.
3. [x] `deck-save-load`: Implement builder save/download and reload round-trip for the full `Deck` (including `slideStyles` and slide background image references, and `useGreenScreen`).
4. [x] `cast-rendering-finish`: Finish cast rendering for title/general slides and green-screen mode (ensure green key visibility by making slide background transparent when `useGreenScreen` is true).

## Priority 2 — Robust casting + persistence correctness

5. [x] `broadcast-partial-updates`: Harden `BroadcastChannel` handling so navigation-only commands (lyricsNavigation) do not unintentionally clear slide/message.
6. [x] `lyrics-state-reset`: Reset `LyricsDisplay` internal state when the cast receives a new `SongData` payload.
7. [x] `deck-edit-reorder-cast-sync`: While in presentation mode, editing/reordering slides should keep the cast screen in sync with the currently-active slide.

## Priority 3 — Presentation richness (minimal but complete)

8. [x] `alignment-and-background-images`: Honor `horizontalAlign`/`verticalAlign` and background image style fields in the cast renderer.
9. [x] `image-slide-rendering`: Implement `SlideType.IMAGE` rendering (image behind/around text).

## Priority 4 — Tests + coverage

10. [x] `unit-tests`: Add/expand Vitest unit tests for `songParser`, lyrics navigation logic, and deck pure helpers. Target “max practical coverage”.
11. [x] `integration-tests`: Add Vitest + React Testing Library integration tests that verify the builder->cast broadcast pipeline (fake `BroadcastChannel`).
12. [x] `playwright-smoke`: Add minimal Playwright smoke tests for “send slide from `/deck` updates `/presentation`”.
13. [x] `coverage-reporting`: Configure test coverage reporting (using Jest/react-scripts in this repo) and add coverage scripts and thresholds.

## Next priority — Runtime migration

- [x] migrate-runtime-to-remix: Vendor stub implemented and server updated to prefer vendorized runtime when present. This allows `npm run start:remix` to run in offline mode by serving public/index.html via a minimal stub. Full Remix runtime and a built ../build are still required for production Remix behavior.

Next steps:
  - When a full Remix runtime is available, add remix, @remix-run/*, vite, @vitejs/plugin-react to package.json devDependencies (change prepared where needed) and run `npm install` then `npm run build:remix` to create a production build under /build.
  - If network install is unavailable in CI, keep vendor/ or prebuilt /build artifacts committed or cached so offline builds and server starts are possible.
  - Update .ralph/AGENT.md with vendor preparation instructions and add a CI caching strategy.

Status: vendor-stub-complete; production Remix build still pending (requires network install or prebuilt /build).
## Next blocked task
- [x] finalize-remix-build: Vendorized minimal Remix runtime and committed /build stub to allow offline start. Added `vendor/@remix-run/node` minimal stub and `/build/index.js` offline stub so `npm run start:remix` works in offline/dev mode. Full production Remix build (real `/build`) still pending network install; when available, run `npm install` + `npm run build:remix` to produce and replace the stub.

## Maintenance

- [ ] fix-act-deprecation: Silence ReactDOMTestUtils.act deprecation warnings. Update tests to import { act } from 'react' and/or upgrade @testing-library/react to a version that uses React.act internally.

