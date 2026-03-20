---
name: Remix Vite + deck UX
overview: Finish migrating the app from CRA (webpack) to Remix + Vite, implement full slide CRUD with deck-wide defaults overridable per slide, fix presenter messaging so slide numbers don’t appear on the cast window, and honor per-slide title vertical placement (top/middle/bottom).
todos:
  - id: style-merge-helper
    content: Add `resolveSlideStyle(deck, slide)` (GENERAL base + type defaults + slide.style) + unit tests; use in send path and presenter.
    status: pending
  - id: deck-defaults-ui
    content: "Deck builder: “Deck defaults” panel bound to `deck.slideStyles`; per-slide editor shows effective values, stores overrides in `slide.style`, with reset-to-default per field."
    status: pending
  - id: slide-crud-editor
    content: Implement new deck, add/duplicate/delete/reorder, and type-specific manual editors (incl. SONG lyrics structure).
    status: pending
  - id: presenter-ux
    content: Remove slide-number messaging from sends; adjust Present layout for top/middle/bottom title overlay; keep lyrics/green-screen behavior.
    status: pending
  - id: remix-vite-wireup
    content: "Replace CRA with Remix+Vite: real root/entry, vite plugin, tsconfig include app/, real server build, update scripts + Playwright webServer."
    status: pending
  - id: dedupe-app-src
    content: Consolidate `app/routes/*` and `src/*` into one shared module set; delete duplicate route logic.
    status: pending
isProject: false
---

# Remix + Vite migration and deck/presenter UX

## Current state (what we found)

- **Runtime today**: Create React App via `[package.json](package.json)` (`react-scripts` = webpack). Entry is `[src/index.tsx](src/index.tsx)` + routes in `[src/App.tsx](src/App.tsx)` (`/deck`, `/presentation`).
- **Remix scaffold exists but is not wired**: `[app/root.tsx](app/root.tsx)` is a placeholder (no `<Outlet/>`, no `Links`/`Scripts`). `[build/index.js](build/index.js)` is a **stub** Remix build. `[vite.config.ts](vite.config.ts)` is plain `@vitejs/plugin-react`, not Remix’s Vite plugin. `[tsconfig.json](tsconfig.json)` only includes `src`, so `app/` is not typechecked by TS today.
- **Duplicate deck/present code paths**: `[src/Deck/DeckBuilder.tsx](src/Deck/DeckBuilder.tsx)` + `[src/Present/Present.tsx](src/Present/Present.tsx)` vs `[app/routes/deck.tsx](app/routes/deck.tsx)` + `[app/routes/presentation.tsx](app/routes/presentation.tsx)` + `[app/utils/*](app/utils)`. The working app uses `src/`; `app/` is a partial copy.

## Product requirements (consolidated)

1. **Tooling**: Full switch from CRA/webpack to **Remix + Vite** (you confirmed).
2. **Deck workflow**: Start a presentation **from scratch**; **add / update / remove** slides without loading a job first; keep **save/load JSON** as today.
3. **Presenter window**: No “slide number” style banner at the top (today this is largely the `#message` text like `Presenting slide N` from `[src/Deck/DeckBuilder.tsx](src/Deck/DeckBuilder.tsx)`).
4. **Title placement**: **Per-slide** choice of **top / middle / bottom** (maps to existing `SlideCSS.verticalAlign` in `[src/Present/PresentTypes.tsx](src/Present/PresentTypes.tsx)`).
5. **Slide editor scope**: Support **GENERAL + TITLE + IMAGE + SONG** with **manual** content entry where needed, plus **style** editing (colors, fonts, alignment-related fields, etc.).
6. **Defaults + overrides (new)**: **Deck-level defaults** that apply to **all slides**, with **per-slide overrides** that win when set.

## Data model for defaults (leverage existing `Deck.slideStyles`)

The `Deck` type already has `slideStyles: Record<string, SlideCSS>`. Plan:

- Treat `**slideStyles[SlideType.GENERAL]`** (and optionally a dedicated key like `"defaults"` if you want defaults independent of the GENERAL slide type) as the **deck-wide base**.
- **Per-slide**: keep `slide.style` as the **override layer**.
- **Resolution rule** (single source of truth, used when sending to presenter and when rendering previews):

```text
effectiveStyle = merge(deck.slideStyles[SlideType.GENERAL], deck.slideStyles[slide.type], slide.style)
```

- **Override semantics**: any property present on `slide.style` replaces the merged default for that property only (shallow merge is enough for current `SlideCSS`).

Implementation detail: centralize this in a small pure helper (e.g. `resolveSlideStyle(deck, slide)`) with unit tests, and call it from:

- Deck builder “Send” / sync paths (today split between `[src/Deck/DeckBuilder.tsx](src/Deck/DeckBuilder.tsx)` and duplicated logic in `[app/routes/deck.tsx](app/routes/deck.tsx)`).
- Presenter rendering in `[src/Present/Present.tsx](src/Present/Present.tsx)` (so the cast window matches what was sent, or re-resolve if you prefer strict “send is canonical”).

**UI for defaults**: add a “Deck defaults” panel editing the merged base (`slideStyles.general` + type-specific defaults if you want them). Slides edited in the per-slide form show **effective** values but persist **only overrides** in `slide.style` (clearing a field could mean “inherit default” — define explicitly in UI, e.g. “Reset to deck default” per field).

## Presenter layout changes

- **Remove slide-index messaging** from send payloads: stop passing `message: Presenting slide ${index + 1}`; use `message: null`/`undefined` for normal sends, reserve `message` for true status (optional) or remove top `#message` from cast UI if unused.
- **Title/subtitle placement**: update `[src/Present/Present.tsx](src/Present/Present.tsx)` so title block position follows `**slide.style.verticalAlign`** (top/middle/bottom) as an overlay (your current flex `computeContainerStyle()` centers the whole text block; we’ll separate **background** from **title overlay** so lyrics/image behavior stays sensible).
- **SONG slides**: lyrics stay primary; title/subtitle overlay obeys the same vertical option (you asked for it to be selectable per slide).

## Deck builder: CRUD + manual type editors

Extend `[src/Deck/DeckBuilder.tsx](src/Deck/DeckBuilder.tsx)` (then mirror or import into Remix routes):

- **New deck** button → creates empty `Deck` with sensible `slideStyles` defaults and **zero or one** starter slide.
- **Slides list**: add / duplicate / delete / reorder (reuse/extend existing `moveSlide` + `lastSentSlideId` sync pattern).
- **Selected slide editor**:
  - Type switch (GENERAL/TITLE/IMAGE/SONG)
  - **GENERAL/TITLE**: title, subTitle, font sizes, style fields
  - **IMAGE**: `file` or `style.backgroundImage` (manual URL/path as in saved JSON today)
  - **SONG**: manual editing of `lyrics` (`SongData`: title/author/verses/lines) via structured UI or validated JSON textarea (start simple, validate shape)
- Keep **BroadcastChannel** behavior and extend `syncSentSlideIfNeeded` to run after edits, not only reorder.

## Remix + Vite: finish the migration (single app surface)

**Goal**: `npm run dev` runs Remix dev (Vite), `/deck` and `/presentation` are Remix routes, CRA removed.

Concrete steps:

1. **Remix app shell**: Replace placeholder `[app/root.tsx](app/root.tsx)` with standard Remix root (`Links`, `Meta`, `Outlet`, `Scripts`, global CSS if needed).
2. **Routes**: Add `[app/routes/_index.tsx](app/routes/_index.tsx)` (redirect or nav links), wire `[app/routes/deck.tsx](app/routes/deck.tsx)` and `[app/routes/presentation.tsx](app/routes/presentation.tsx)` to **import the real components** from a shared module (either move `DeckBuilder`/`Presentation` into `app/` or a `shared/` folder — avoid maintaining two copies).
3. **Vite**: Replace minimal `[vite.config.ts](vite.config.ts)` with Remix’s Vite plugin setup for v2 Remix (or align package versions — today you have Remix **1.19** in deps; the plan should pick **one** supported Remix+Vite pairing and bump deps consistently).
4. **TypeScript**: Expand `[tsconfig.json](tsconfig.json)` `include` to cover `app/` (and `shared/` if introduced); add path aliases if useful.
5. **Server**: Keep `[server/index.js](server/index.js)` as production entry **or** switch to `remix-serve` — but ensure it loads a **real** Remix server build, not `[build/index.js](build/index.js)` stub. Remove/gate the stub once real builds work.
6. **package.json scripts**: Replace `start`/`build`/`test` from `react-scripts` with Remix/Vite equivalents; update Playwright `[playwright.config.ts](playwright.config.ts)` `webServer.command` accordingly.
7. **Cleanup**: Remove CRA-specific files when unused (`public/index.html` template reliance, `src/index.tsx` bootstrap, `react-scripts` deps).

## Testing updates

- **Unit**: `resolveSlideStyle` merge order + override behavior; DeckBuilder CRUD smoke tests.
- **Integration**: update `[src/integration/deck-to-presentation.test.tsx](src/integration/deck-to-presentation.test.tsx)` if `#message` expectations change.
- **E2E**: update `[e2e/smoke.spec.ts](e2e/smoke.spec.ts)` assertion on `#message` if presenter no longer shows “Presenting slide …”.

## Risk notes

- Remix 1.x + Vite wiring differs from Remix 2; **dependency alignment** is the main migration risk — plan includes a deliberate version choice before editing configs.
- Duplicated `app/` vs `src/` must end as **one implementation** to avoid drift.

