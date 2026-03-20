# Fix plan — poster (Ralph execution list)

**Loop start / reset:** see **“Loop start state”** in [.ralph/AGENT.md](./AGENT.md) — `config.json` `maxIterations`, `progress.txt` `LOOP START` banner, and this file’s marked tasks must be consistent before `./.ralph/ralph.sh` runs.

**Active roadmap:** [.cursor/plans/remix_vite_+_deck_ux_7fba078c.plan.md](../.cursor/plans/remix_vite_+_deck_ux_7fba078c.plan.md)

**How Ralph counts “open work”:** only markdown checklist lines `- [ ] …` **between** `<!-- ralph-open-tasks-start -->` and `<!-- ralph-open-tasks-end -->` below. When every such item is checked `- [x]` or removed, `ralph.sh` exits. Lines containing `blocked` (case-insensitive) are ignored when `ignoreBlockedUncheckedTasks` is true in `.ralph/config.json`.

Completed items should be marked `[x]` or moved to **Completed (archive)** so the open section stays accurate.

<!-- ralph-open-tasks-start -->

- [x] `style-merge-helper`: Add `resolveSlideStyle(deck, slide)` — merge `deck.slideStyles[general]`, then type-specific `slideStyles[slide.type]`, then `slide.style` (shallow override) + unit tests; use on send path and presenter.
- [x] `deck-defaults-ui`: Deck builder “Deck defaults” panel bound to `deck.slideStyles`; per-slide editor shows effective style, persists overrides in `slide.style`, reset-to-default per field.
- [x] `slide-crud-editor`: New deck from scratch; add / duplicate / delete / reorder slides; type-specific manual editors for GENERAL, TITLE, IMAGE, SONG (incl. lyrics structure).
- [x] `presenter-ux`: Remove slide-index / “Presenting slide N” from cast (`#message`); title/subtitle overlay follows `verticalAlign` top|middle|bottom; preserve lyrics + green-screen behavior.
- [ ] `remix-vite-wireup`: Replace CRA with Remix+Vite (real `app/root`, routes, vite plugin, tsconfig includes `app/`, production server build, `package.json` scripts, Playwright `webServer`).
- [ ] `dedupe-app-src`: Single source for deck/present — Remix routes import shared modules; remove duplicate `app/routes` vs `src` logic.

<!-- ralph-open-tasks-end -->

## Optional / blocked (outside open-task window)

These do **not** count toward loop exit unless moved inside the markers above.

- [ ] `finalize-remix-build-real`: Run `npm install` and production Remix build to replace `/build` stub; network or prebuilt artifact required (**blocked**: network).

## Completed (archive)

Prior iterations (legacy plan `.cursor/plans/poster-remix-tests_d601662c.plan.md`):

- [x] Poster specs under `.ralph/specs/*`, loop config, session-plan scaffolding
- [x] Song XML → single SONG slide + `lyricsNavigation` + LyricsDisplay
- [x] Deck save/load JSON round-trip, cast rendering + green screen transparency
- [x] Broadcast partial updates; lyrics reset on new song; reorder sync to cast
- [x] Alignment + background images; IMAGE slide rendering
- [x] Unit / integration / Playwright smoke / Jest coverage thresholds
- [x] Vendor stub + offline `/build/index.js` stub for `start:remix` dev
