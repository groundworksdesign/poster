# Poster: product acceptance (requirements entry point)

This file summarizes **what “done” means** for Poster: product intent, runtime constraints, and shipping behavior. Use it as the **single checklist** when scoping work or reconciling task loops.

**Canonical sources** (keep them in sync when behavior changes):

| Layer | Path | Role |
| --- | --- | --- |
| Product vision, roles, design principles, layout contract, SQLite library direction | [`ralph/epic.md`](ralph/epic.md) | Long-form design guide |
| Epic plans (scoped deliverables, status, todos) | [`docs/epics/`](docs/epics/) | e.g. [`epic-001-tech-stack-and-runtime-workflows.plan.md`](docs/epics/epic-001-tech-stack-and-runtime-workflows.plan.md), [`epic-002-theme-install-reorg.plan.md`](docs/epics/epic-002-theme-install-reorg.plan.md) |
| Operator how-to: dev server, production start, SQLite, portable zip, Electron, CI, Releases | [`README.md`](README.md) | Day-to-day run and ship instructions |

If acceptance criteria conflict, resolve in this order: **safety and correctness** > **documented epic plan for that area** > **`ralph/epic.md` principles** > **this summary**.

---

## 1. Core product acceptance

Aligned with [`ralph/epic.md`](ralph/epic.md).

- **Two surfaces, one show:** An **operator** deck builder and a **program** presenter view stay in sync during live use; **program** output is suitable for **capture into a video mixer** (readable type, stable layout, keying when configured).
- **Same-origin sync:** Operator and presenter use the browser **`BroadcastChannel`** named **`presentation`**; both views run in the **same browser origin** (no cross-origin slide sync in core v1).
- **Separation of concerns:** Control UI does not appear on the presenter route unless an explicit preview or similar mode is a deliberate product feature.
- **Files as portable truth:** JSON/XML import and export remain **first-class**; nothing essential is trapped in storage operators cannot extract.
- **Content model:** Decks and slides follow shared TypeScript models (`Deck`, `Slide`, `PresentData`, `SongData`); presenter receives **`PresentData`** including slide, optional message, green-screen flag, and lyrics navigation when in song flow.
- **Lyrics behavior:** Song lyrics advance in **two-line segments** on program; partial **`PresentData`** updates can adjust lyrics navigation without replacing the whole slide payload unnecessarily.
- **Alignment contract:** Slide placement uses a **3x3 grid vocabulary** (e.g. `bottom-middle`, `center-middle`) consistent with live video expectations; changes that break TD/mixer presets are regressions unless explicitly approved.
- **Local library direction:** A **SQLite-backed** local library for decks, lyrics, and assets is the **intended** durable store; **JSON export** remains the handoff format for VCS and sharing. Implementation details follow epic plans and ADRs.

---

## 2. Runtime and architecture acceptance

Aligned with [`docs/epics/epic-001-tech-stack-and-runtime-workflows.plan.md`](docs/epics/epic-001-tech-stack-and-runtime-workflows.plan.md) and ADR 0001.

- **UI:** React 18 + TypeScript for shared types and components.
- **Routing:** Remix is the **primary** app path (`app/` routes, `pnpm dev` / `remix dev` per project scripts); CRA may remain for legacy `build` / Jest until consolidated.
- **HTTP:** Express [`server/index.js`](server/index.js) serves static assets and Remix via **`createRequestHandler`** when the Remix build exists; documented fallback behavior if the Remix build is absent.
- **Tests:** Jest + React Testing Library for units; Playwright for cross-route and channel behavior where applicable.
- **E2E / library APIs:** Remix library routes must be called in a way that returns JSON for programmatic use (e.g. `_data` / loader JSON as documented in [`README.md`](README.md) and [`src/utils/remixDataUrl.ts`](src/utils/remixDataUrl.ts)), not accidental HTML shell responses.

---

## 3. Epic 002 delivery acceptance (themes, home library, packaging, CI)

Aligned with [`docs/epics/epic-002-theme-install-reorg.plan.md`](docs/epics/epic-002-theme-install-reorg.plan.md) and operator steps in [`README.md`](README.md).

### Themes

- **Four** selectable dark themes on home: **Dracula**, **Tokyo Night**, **dark blue** (navy), **GitHub-dark-style** neutrals.
- Theming uses **`[data-theme]`** on the document root with CSS variables; home persists choice in **`localStorage`** (e.g. key **`poster-theme`**). Optional early script to reduce theme **FOUC** is acceptable.

### Home library UX

- **Home** exposes the same **library** capabilities as the deck-side panel (list, open, export, delete, backup, restore) via shared **`LibraryPanel`** (deck remains the place for file import and full editing workflow).
- **Open from home** navigates to **`/deck?open=<id>`**; **`DeckBuilder`** loads from the library and **clears** the `open` query param after handling.
- **Import path from home** uses **`/deck?focusImport=1`** (or equivalent); deck focuses/opens the file input once and **removes** the flag.
- **Deck route** does not duplicate two full library panels by default (trimmed or de-emphasized per epic).

### Portable zip packaging

- Production bundle is **zipped per OS** in CI; **`better-sqlite3`** (and native deps) must be **built on the target OS** -- no mixing `node_modules` across platforms.
- Archive includes runtime needs (e.g. `build/`, `server/`, `public/`, lockfile, prod `node_modules`, **`PORTABLE.md`** with run instructions). **Canonical packager:** [`scripts/package-portable.mjs`](scripts/package-portable.mjs) via **`pnpm run package:portable`** (see [`README.md`](README.md)).

### Electron

- Electron **main** runs the same Node server and loads the app at **localhost**; **`contextIsolation: true`**, **`nodeIntegration: false`**; **`npmRebuild: true`** (or equivalent) so native modules match Electron.
- **Per-OS installers** are required artifacts: **macOS DMG**, **Windows NSIS `.exe`**, **Linux `.deb` and/or AppImage** as configured (see [`electron-builder.yml`](electron-builder.yml)). Unsigned builds are acceptable unless signing secrets are added.

### GitHub Actions

- **PR workflow:** Builds **portable zips** (matrix) and **Electron installers** (matrix), **`upload-artifact`** with distinguishable names (PR number / SHA as documented).
- **Release workflow:** On semver tag **`v*.*.*`**, builds the **same** artifact types and **attaches** them to the **GitHub Release**; **`package.json` `version`** aligns with the tag for consistent file names and shipped version.

---

## 4. SQLite library operator acceptance

Aligned with [`README.md`](README.md) and library direction in [`ralph/epic.md`](ralph/epic.md).

- Default DB file location and **`POSTER_DB_PATH`** override behavior match documented operator expectations.
- Driver selection (**`better-sqlite3`**, fallback **`node:sqlite`**, then JSON file fallback) behaves as documented; optional logging env vars work as described.

---

## 5. Explicit non-goals (reference)

Do not treat the following as required acceptance unless promoted in [`ralph/epic.md`](ralph/epic.md) or an epic plan: mandatory cloud accounts, cross-WAN multi-operator authority, full motion-graphics timelines as a baseline, **codesign/notarize** for Apple builds unless an epic adds secrets and workflow.

---

## 6. Maintenance

When product behavior, packaging, or CI changes:

1. Update the **relevant canonical doc** ([`ralph/epic.md`](ralph/epic.md), [`docs/epics/`](docs/epics/), [`README.md`](README.md)).
2. Adjust **this file** so automated or human task loops still have one checklist.
