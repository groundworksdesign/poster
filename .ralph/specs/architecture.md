# Architecture

High-level architecture and module responsibilities.

- Routes
  - `/deck` (composer): deck editing, defaults panel, per-slide forms, import/export, BroadcastChannel sender, `resolveSlideStyle` before send.
  - `/presentation` (cast): current slide + `LyricsDisplay`, listens for full `PresentData` and partial `lyricsNavigation` updates.

- **Single implementation (target)**
  - Remix routes under `app/routes/*` should import shared UI/logic (e.g. under `src/` or `shared/`) — **no duplicated** deck/present components between `app/routes` and `src`.

- Server
  - `server/index.js`: Express + Remix request handler when real `/build` exists; vendorized `@remix-run/node` optional; avoid relying on `/build/index.js` stub in production.

- Broadcast pipeline
  - `src/Present/Broadcast.ts` (or shared equivalent): `BroadcastChannel` wrapper.
  - Tests: `FakeBroadcastChannel` routes `postMessage` between instances.
  - Partial updates: `lyricsNavigation` must not clear `slide` / `message` unintentionally.

- Pure logic modules
  - **`resolveSlideStyle(deck, slide)`**: merge order `slideStyles[general]` → `slideStyles[slide.type]` → `slide.style` (shallow per key).
  - Deck helpers: add / duplicate / delete / reorder / serialize.
  - `songParser`: XML → `SongData`.

- Testing
  - Unit: Jest (current) for pure functions and small components.
  - Integration: RTL + fake channel.
  - Playwright: two pages, same browser context for `BroadcastChannel`.

- Build & CI
  - Target: **Vite + Remix** dev and build scripts; remove CRA when parity reached.
  - Cache `vendor/` + real `/build` when offline (see `.ralph/AGENT_VENDOR.md`).
