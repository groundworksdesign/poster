# Project Memory

This file is maintained by the Ralph loop. Each plan, dev, and QA phase reads it for context and appends new discoveries.

Keep entries concise and non-obvious. Remove entries that are no longer relevant.

## Commands

- Install: `pnpm install`
- Dev: `pnpm dev` (Remix, port 3000)
- Build: `pnpm run build:remix` then `pnpm start` (`src/adapters/persistence/server.js`)
- Unit tests: `CI=true pnpm test -- --watchAll=false`
- E2E (Remix): `pnpm run test:e2e:remix`
- E2E (Electron): `pnpm run test:e2e:electron`
- Electron: `pnpm run electron`
- No dedicated lint script; ESLint via react-scripts config

## Conventions

- Clean architecture rings: domain ← application ← adapters/presentation
- Remix lives under `src/adapters/remix` (not root `app/`)
- Playwright lives under `tests/e2e` (not root `e2e/`)
- Ralph loop harness is `ralph/`; never recreate `.ralph/`

## Gotchas

- From `tests/e2e`, repo root is `../..` (two levels). `path.resolve(__dirname, '..')` incorrectly points at `tests/` after the move — known break in electronHelpers and several specs at planning loop 1.
- `playwright.remix.config.ts` already uses `path.join(__dirname, '..', '..')` correctly.
- CI `paths-ignore` includes `ralph/**`, so harness-only commits skip the full PR pipeline.

## Epic-006 planning (loop 1)

- Structural restructure already on branch / draft PR #21.
- Selected first task: fix-e2e-repo-root-paths (highest runtime risk for Electron smoke + sample-deck e2e).
- Concurrent commit `cc2233f` already applied the `../..` root fixes (and library relaunch/repoint server entry). Task stays selected for confirm + QA `passes`; do not set `passes` in planning/dev.

## Epic-006 dev (fix-e2e-repo-root-paths)

- Added `tests/e2e/repoRoot.ts` + `.cjs` (+ `repoRoot.selfcheck.cjs`).
- Wired electronHelpers, theme relaunch, home-library, library, remix library relaunch/repoint, smoke, import-validation to REPO_ROOT.
- Playwright CRA configs set `webServer.cwd` to repo root (Playwright default is the config dir = `tests/e2e`).
- Do not set `passes: true` here; QA owns that.

## Epic-006 QA (fix-e2e-repo-root-paths)

- PASS: REPO_ROOT is repo root; Electron launch args and Playwright webServer cwd use it; sample deck + persistence server paths exist; selfcheck green. passes=true for task 1 only.

## Epic-006 planning (loop 2) — Jack AppImage baseline

- Tip `9f124e1` AppImage: NOT READY. Present cold hydrate flaky (1/3 PASS, 2/3 SSR Loading); On Program blocked; Home/library/theme + clean-arch layout PASS.
- CI on that tip: unit green; Remix E2E + Electron smoke red (helpers under tests/) — should be fixed by e2e root work; confirm via verify-remix-electron-e2e-green.
- Added REQ-006/007 and tasks fix-present-first-open-hydrate + verify-on-program-after-present-hydrate; did not drop prior backlog.
- Selected next: fix-present-first-open-hydrate (highest product risk; unblocks On Program and AppImage sign-off). Layer import audit deferred (quick scan already clean).

## Epic-006 dev (fix-present-first-open-hydrate)

- PR #18 Deck path (skip about:blank when window.poster; absolute Present URL) already intact after clean-arch move.
- Residual AppImage flake: Chromium window.open allow after async spawnPresent. Fix: main.cjs openPresentSessionWindow + deny for present-session (main-owned loadURL with preload).
- Tests: electron-main.regression, openPresentWindow, homeWindowPolicy, DeckBuilder.unit Open Present cases — pass. passes remains false for QA/Jack.


## Epic-006 QA (fix-present-first-open-hydrate)

- PASS (2026-09-14T15:18:30.000Z): main-owned present-session loadURL + PR #18 Deck path intact; 51 focused tests green. Jack AppImage retest still required for packaged sign-off.

## Epic-006 planning (loop 3)

- Selected verify-on-program-after-present-hydrate (REQ-007) now that hydrate passes.
- On Program UI/domain/remix e2e already exist; task is post-hydrate verification (Electron path priority).
- Remaining backlog: audit-layer-import-rule, harden-config-ci-script-paths, verify-unit-integration-green, verify-remix-electron-e2e-green, document-appimage-residual-risk.


## Epic-006 dev (verify-on-program-after-present-hydrate)

- Added Electron e2e `electron-program-thumbnail.spec.ts`: cold present-ready → Start → Deck On Program matches Present; End clears.
- No product UI change required; directed thumbnail path already worked once Present hydrates.
- AppImage installer retest still Jack/REQ-005. passes=false for QA.


## Epic-006 QA (verify-on-program-after-present-hydrate)

- PASS (2026-09-14T15:25:24.000Z): Electron On Program e2e green after cold present-ready; programThumbnail unit/integration green. AppImage installer retest still Jack/REQ-005.


## Epic-006 planning (loop 4)

- Selected audit-layer-import-rule (REQ-002) after On Program QA pass.
- Quick scan already clean; task still needs explicit audit evidence (+ optional guard).
- Next after that: harden-config-ci-script-paths (stale README paths), then suite greens, then AppImage residual doc.


## Epic-006 planning (loop 5)

- Re-selected audit-layer-import-rule (still pending; no audit evidence landed after loop 4 select).
- Tip c361bae; draft PR #21 only. No product code.
- Remaining pending after audit: harden-config-ci-script-paths, verify-unit-integration-green, verify-remix-electron-e2e-green, document-appimage-residual-risk.


## Epic-006 dev (audit-layer-import-rule)

- Full audit of `src/domain` + `src/application` (production + colocated tests): no `@remix-run` / `remix` / `electron` / `@electron` / `playwright` / `@playwright` imports/requires; no relative imports into adapters/presentation/e2e.
- Comment-only mentions remain (application index dependency rule; posterSessionGraph "Used by Electron main"; SessionTransport `deckCommandElectron` name).
- Durable guard: `src/__tests__/layer-import-rule.test.js` (source walk + import/require/export-from parse; CI unit-integration picks it up).
- Verified: `CI=true pnpm exec react-scripts test --watchAll=false --testPathPattern=layer-import-rule` — 3 passed.
- `passes` left false for QA.


## Epic-006 QA (audit-layer-import-rule)

- PASS (2026-09-14T15:33:30.000Z): independent domain/application import audit clean (20 files, 0 leaks); `layer-import-rule.test.js` 3/3 green; passes true.
