# Architecture

High-level architecture and module responsibilities.

- Routes
  - `/deck` (composer/editor): React route handling deck editing, slide forms (react-hook-form + zod), file import/export, and BroadcastChannel sender logic.
  - `/presentation` (cast renderer): React route showing current slide and LyricsDisplay, listens to BroadcastChannel messages and applies partial updates.

- Server
  - `server/index.js` acts as a minimal runtime server for development and supports a vendorized runtime (`vendor/@remix-run/node`) or a SPA fallback when Remix packages are not installed.
  - For production, prefer a real Remix `/build` created by `remix build`.

- Runtime vendorization (offline)
  - `vendor/` holds copies of runtime packages required at runtime (e.g., `@remix-run/node`) so the server can require them even offline.
  - `/build` can be committed as a prebuilt artifact for offline starts or cached in CI.

- Broadcast pipeline
  - `src/Present/Broadcast.ts` (or similar) provides a small wrapper around the browser BroadcastChannel.
  - Tests provide a `FakeBroadcastChannel` that registers instances and forwards postMessage calls to `onmessage` handlers across instances.
  - PresentData merging rules: `lyricsNavigation` partial updates must not clear `slide` or `message` when present.

- Pure logic modules
  - Deck helpers: add/move/duplicate/delete/reorder/serialize functions kept pure for unit testing.
  - songParser: XML -> SongData parsing with unit tests covering edge cases.

- Testing
  - Unit: Vitest for pure logic and small react components.
  - Integration: React Testing Library with FakeBroadcastChannel for builder->presentation flows.
  - Playwright: minimal smoke tests that exercise two pages and BroadcastChannel message routing.

- Build & CI
  - Prefer caching vendor/ and /build artifacts in CI when network installs are not available.
  - Document vendorization steps in `.ralph/AGENT_VENDOR.md`.
