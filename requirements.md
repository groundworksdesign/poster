# Poster: product acceptance (requirements entry point)

This file summarizes **what “done” means** for Poster: product intent, runtime constraints, and shipping behavior. Use it as the **single checklist** when scoping work or reconciling task loops.

**Canonical sources** (keep them in sync when behavior changes):

| Layer | Path | Role |
| --- | --- | --- |
| Product vision, roles, design principles, layout contract, SQLite library direction | [`ralph/epic.md`](ralph/epic.md) | Long-form design guide |
| Epic plans (scoped deliverables, status, todos) | [`docs/epics/`](docs/epics/) | e.g. [`epic-001-tech-stack-and-runtime-workflows.plan.md`](docs/epics/epic-001-tech-stack-and-runtime-workflows.plan.md), [`epic-002-theme-install-reorg.plan.md`](docs/epics/epic-002-theme-install-reorg.plan.md), [`epic-005-next-cycle-fixes.plan.md`](docs/epics/epic-005-next-cycle-fixes.plan.md) |
| Regression suite map: real test files per defect | [`next-cycle-test-harness.md`](docs/epics/next-cycle-test-harness.md) | Pass/fail assertions for the epic-005 fixes |
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
- **Routing:** Remix is the **primary** app path (`src/adapters/remix` routes via `remix.config.js` `appDirectory`, `pnpm dev` / `remix dev` per project scripts); CRA may remain for legacy `build` / Jest until consolidated.
- **HTTP:** Express [`src/adapters/persistence/server.js`](src/adapters/persistence/server.js) serves static assets and Remix via **`createRequestHandler`** when the Remix build exists; documented fallback behavior if the Remix build is absent.
- **Tests:** Jest + React Testing Library for units; Playwright for cross-route and channel behavior where applicable.
- **E2E / library APIs:** Remix library routes must be called in a way that returns JSON for programmatic use (e.g. `_data` / loader JSON as documented in [`README.md`](README.md) and [`src/utils/remixDataUrl.ts`](src/utils/remixDataUrl.ts)), not accidental HTML shell responses.

---

## 3. Epic 002 delivery acceptance (themes, home library, packaging, CI)

Aligned with [`docs/epics/epic-002-theme-install-reorg.plan.md`](docs/epics/epic-002-theme-install-reorg.plan.md) and operator steps in [`README.md`](README.md).

### Themes

- **Four** selectable dark themes on home: **Dracula**, **Tokyo Night**, **dark blue** (navy), **GitHub-dark-style** neutrals (plus Light as the default).
- Theming uses **`[data-theme]`** on the document root with CSS variables; the selected theme persists across quit + relaunch in a durable, user-owned preference file at **`~/.poster/theme.json`** (Electron reads/writes the same file), while a local browser fallback keeps live runtime sync across windows. An early script reduces theme **FOUC** before first paint.

### Home library UX

- **Home** exposes the same **library** capabilities as the deck-side panel (list, open, export, delete, backup, restore) via shared **`LibraryPanel`** (deck remains the place for file import and full editing workflow).
- **Open from home** navigates to **`/deck?open=<id>`**; **`DeckBuilder`** loads from the library and **clears** the `open` query param after handling.
- **Import path from home** uses **`/deck?focusImport=1`** (or equivalent); deck focuses/opens the file input once and **removes** the flag.
- **Deck route** does not duplicate two full library panels by default (trimmed or de-emphasized per epic).
- **Library root is re-pointable** via the Home **Change...** control: the new folder becomes the active library root (persisted in `library-settings.json` under the durable home), and the previous folder is left **untouched** (no automatic move or copy).

### Portable zip packaging

- Production bundle is **zipped per OS** in CI; **`better-sqlite3`** (and native deps) must be **built on the target OS** -- no mixing `node_modules` across platforms.
- Archive includes runtime needs (e.g. `build/`, `src/adapters/persistence/` (+ realtime/domain as packed), `public/`, lockfile, prod `node_modules`, **`PORTABLE.md`** with run instructions). **Canonical packager:** [`scripts/package-portable.mjs`](scripts/package-portable.mjs) via **`pnpm run package:portable`** (see [`README.md`](README.md)).

### Electron

- Electron **main** runs the same Node server and loads the app at **localhost**; **`contextIsolation: true`**, **`nodeIntegration: false`**; **`npmRebuild: true`** (or equivalent) so native modules match Electron.
- **Per-OS installers** are required artifacts: **macOS DMG**, **Windows NSIS `.exe`**, **Linux `.deb` and/or AppImage** as configured (see [`electron-builder.yml`](electron-builder.yml)). Unsigned builds are acceptable unless signing secrets are added.
- **Auto-update:** Packaged **Windows/Linux** builds may download and install newer GitHub Releases in-app; **macOS** alerts and opens the Releases download page until Developer ID + notarization exist (see [`docs/auto-update.md`](docs/auto-update.md)).

### GitHub Actions

- **PR workflow:** Builds **portable zips** (matrix) and **Electron installers** (matrix), **`upload-artifact`** with distinguishable names (PR number / SHA as documented).
- **Release workflow:** On semver tag **`v*.*.*`**, builds the **same** artifact types and **attaches** them to the **GitHub Release**; **`package.json` `version`** aligns with the tag for consistent file names and shipped version.

---

## 4. SQLite library operator acceptance

Aligned with [`README.md`](README.md) and library direction in [`ralph/epic.md`](ralph/epic.md).

- The local library lives under a **durable user-owned root**, defaulting to **`~/.poster`**; it is not tied to the process working directory or an AppImage extraction dir (so it survives updates and reinstall).
- Driver selection (**`better-sqlite3`**, fallback **`node:sqlite`**, then JSON file fallback) and optional logging env vars behave as documented.
- Legacy `poster.sqlite` / `poster.library.json` from the process working directory **migrates once** to the durable root; a marker under the user home prevents re-running; the source is never modified or deleted.
- Environment overrides are honored: `POSTER_HOME` (durable home root), `POSTER_LIBRARY_PATH` (active library root), and **`POSTER_DB_PATH`** / `POSTER_LIBRARY_JSON_PATH` (individual store file paths).

---

## 5. Epic 005 delivery acceptance (Present fixes, theme persistence, durable library, Home guard)

Aligned with [`docs/epics/epic-005-next-cycle-fixes.plan.md`](docs/epics/epic-005-next-cycle-fixes.plan.md); shipped in tasks 1–6 and guarded by the regression harness (task 7). Do not re-propose these as open work.

### Present session lifecycle

- **End blanks Present:** End sends a directed blank/clear to the selected Present child(ren) only; the Present viewport clears (no title/body slide content); Start after End sends the first slide again.
- **Closing Present cleans up:** closing a Present window (or using an explicit close) unregisters it from the deck session list; the deck UI list drops the stale UUID; directed/all-child sends never target a closed id; closing one of N Presents leaves the others intact.

### On-program thumbnail

- The deck shows a **true program-out preview** derived from the same program state pushed to Present (slides, messages, song lyric segments, green-screen flag, blank after End).
- Placement is **with the Presentation controls region** (Start / Previous / Next / End / Go), not in the deck metadata block.
- It updates on Start / Next / Previous / Go / End / Send.

### Theme persistence

- The selected theme persists across full quit + relaunch for Home, deck, and Present from **`~/.poster/theme.json`** (invalid/missing values fall back safely); changing the theme still applies live to all open windows.

### Home guard

- Home exposes **no bare "Open Present"** action; Present windows open only through the deck workflow, and a bare `/presentation` route shows operator guidance.

### Library durability

- Fresh installs default to **`~/.poster`** (no forced first-run picker); an optional **Change...** re-points the library and leaves the old folder untouched.
- Data survives relaunch, cwd changes/wipe, and reinstall simulations (install dir wiped, `~/.poster` kept).

---

## 6. Explicit non-goals (reference)

Do not treat the following as required acceptance unless promoted in [`ralph/epic.md`](ralph/epic.md) or an epic plan: mandatory cloud accounts, cross-WAN multi-operator authority, full motion-graphics timelines as a baseline, **codesign/notarize** for Apple builds unless an epic adds secrets and workflow.

---

## 7. Maintenance

When product behavior, packaging, or CI changes:

1. Update the **relevant canonical doc** ([`ralph/epic.md`](ralph/epic.md), [`docs/epics/`](docs/epics/), [`README.md`](README.md)).
2. Adjust **this file** so automated or human task loops still have one checklist.
