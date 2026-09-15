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


## Epic-006 planning (loop 6)

- Selected harden-config-ci-script-paths (REQ-003) after audit-layer-import-rule QA pass.
- Runtime/adapters already aligned; README (+ similar) still cite stale electron/main.cjs and server/index.js.
- Remaining after this: verify-unit-integration-green, verify-remix-electron-e2e-green, document-appimage-residual-risk.
- Draft PR #21 only; no product code.


## Epic-006 dev (harden-config-ci-script-paths)

- Runtime already correct (package.json main/start, remix appDirectory, electron-builder files, package-portable.mjs).
- Fixed operator README + requirements.md stale electron/main.cjs and server/index.js; qualified tests/e2e Playwright config paths.
- Added src/__tests__/config-path-alignment.test.js (5 tests green). Left historical docs/epics untouched.
- passes left false for QA (2026-09-14T15:44:04.000Z).


## Epic-006 QA (harden-config-ci-script-paths)

- PASS (2026-09-14T15:47:15.000Z): independent config/docs audit clean; config-path-alignment.test.js 5/5; passes true.


## Epic-006 planning (loop 7)

- Selected verify-unit-integration-green (REQ-004) after harden-config-ci-script-paths QA pass.
- Tip c5dc68f; draft PR #21 only. No product code.
- Remaining after this: verify-remix-electron-e2e-green, document-appimage-residual-risk.


## Epic-006 dev (verify-unit-integration-green)

- Ran CI-equivalent: tsc --noEmit exit 0; Jest --watchAll=false --runInBand 41 suites / 254 tests passed.
- No restructure-induced failures; no product code changes.
- passes left false for QA.


## Epic-006 QA (verify-unit-integration-green)

- PASS (2026-09-14T15:52:35.000Z): independent tsc exit 0; Jest 41/254 green; passes true. REQ-004 still pending e2e todo.


## Epic-006 planning (loop 8)

- Selected verify-remix-electron-e2e-green (REQ-004 remaining half) after unit-integration QA pass.
- Tip f1f2a9d; draft PR #21 only. No product code.
- Remaining after this: document-appimage-residual-risk.


## Epic-006 dev (verify-remix-electron-e2e-green)

- helpers-under-tests gone: repoRoot.selfcheck ok.
- Remix e2e 52 passed; Electron e2e 9 passed after production remix build.
- Electron Home timeout was jsx-dev-runtime build left by remix e2e (SSR 500), not path roots.
- Added electron.global-setup.cjs to ensure production build before Electron specs.
- passes left false for QA.


## Epic-006 QA (verify-remix-electron-e2e-green)

- PASS (2026-09-14T16:05:35.000Z): remix 52 + electron 9; repoRoot ok; globalSetup rebuild observed; passes true. REQ-004 done.


## Epic-006 planning (loop 9)

- Selected document-appimage-residual-risk (REQ-005) — last unfinished after e2e QA pass.
- Tip 03224fc; draft PR #21 only. No product code.
- After this: epic documentation DoD; completeEpic still false until QA passes.


## Epic-006 dev (document-appimage-residual-risk)

- Added docs/appimage-residual-risk.md with 9f124e1 baseline, residual risks, and Jack checklist (Home, library, cold Present x3, directed-send, message-only, On Program, theme).
- Linked from README + epic. No AppImage binary claimed proven.
- passes left false for QA.


## Epic-006 QA (document-appimage-residual-risk)

- PASS (2026-09-14T16:11:31.000Z): docs/appimage-residual-risk.md complete vs Jack checklist; passes true.
- completeEpic true. Draft PR #21 stays draft (no ready/merge).


## Epic-006 planning (loop 10) — Jack tip 497d454 Library→Present

- Tip `497d454` AppImage/packaged: NOT READY. Blank-deck Open Present+send 3/3 PASS; Library Open → Present FAIL (SSR Loading ≥30s, no hydrate). Message-only, On Program, theme, library root, Home PASS.
- Reopened epic (`completeEpic` false / `status` in_progress). Added REQ-008 + todo `fix-library-open-present-hydrate`; selected that task (numeric task-status id 9).
- Hypothesis for DEV: after Library Open, Present may still use popup/`about:blank` (`present-blank`) or wrong URL/session vs blank-deck — Library Deck open uses `noopener`/named `posterDeck`/assign fallback; may lack `window.poster` so `planPresentOpen` falls back to `browser-gesture-blank`. Main-owned `present-session` (REQ-006) covers blank-deck path; Electron e2e does not cover Library→Present.
- Draft PR #21 only; no product code this persona.

## Epic-006 DEV (fix-library-open-present-hydrate)

- Root cause: HomePage Library Open used `noopener,noreferrer`, so Electron skipped `did-create-window` and the Library Deck never received `attachWindowOpenPolicy`. Open Present then missed main-owned `present-session` and could stick on SSR Loading (Jack tip 497d454).
- Fix: `handleOpenFromLibrary` now matches blank-deck Open Presentation (`_blank` + `POPUP_FEATURES`, no noopener).
- Tests: HomePage unit REQ-008; `tests/e2e/electron-library-present-hydrate.spec.ts` + `openDeckFromLibrary` helper.
- passes left false for QA; completeEpic false; draft PR #21 only.

## Epic-006 QA (fix-library-open-present-hydrate)

- PASS (2026-09-14T23:52:47.000Z): tip a4a1a18 — Library Open aligned with blank-deck (no noopener); unit REQ-008 + Electron library-present-hydrate + blank-deck program-thumbnail PASS.
- completeEpic true. Draft PR #21 stays draft (no ready/merge). Jack AppImage READY still residual.

## Epic-006 planning (loop 11) — Jack tip 7c947cd blank-deck after import

- Tip `7c947cd` AppImage: NOT READY. Library Open → Present 3/3 PASS (REQ-008). Blank-deck cold Present+send after file import FAIL flaky (~1/3–1/2). Tip Electron PASS; CI installers green.
- Reopened epic (`completeEpic` false / `status` in_progress). Added REQ-009 + todo `fix-appimage-blank-deck-present-send-after-import`; selected that task (task-status id 10).
- Hypothesis for DEV: AppImage/FUSE or post-import timing/session race tip Electron does not hit (FileReader import, named `posterDeck` window, Present/send before session ready).
- Draft PR #21 only; no product code this persona.

## Epic-006 DEV (fix-appimage-blank-deck-present-send-after-import)

- Root cause: AppImage/FUSE + post-import race — named `posterDeck` Import window and/or late `window.poster` after FileReader made cold Open Present fall through to about:blank SSR Loading; Start/send could fire before Present child-ready.
- Fix: Import CTA uses `_blank`+POPUP_FEATURES; `waitForPosterBridge` before `planPresentOpen`; Start gated on Present `child-ready`.
- Tests: HomePage REQ-009 unit; openPresentWindow late-poster unit; `tests/e2e/electron-import-present-send.spec.ts`.
- Docs: `docs/appimage-residual-risk.md` tip `7c947cd` + Import→Present→send checklist.
- passes left false for QA; completeEpic false; draft PR #21 only.

## Epic-006 DEV fix-up (fix-appimage-blank-deck-present-send-after-import)

- QA FAIL @ 7db2047: DeckBuilder.unit Open Present (browser) — openSpy 0 calls (bridge wait before about:blank).
- Fix: `isElectronUserAgent` gates `waitForPosterBridge` in `openPresentForRuntime`; browser/jsdom opens about:blank in click turn; Electron still waits for late poster after import.
- Unit 261 PASS; Electron import→Present→send + library hydrate kept green. passesQA false.
