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

## Epic-006 QA (fix-appimage-blank-deck-present-send-after-import)

- PASS (2026-09-15T00:41:52.000Z): tip 083bfcb — Electron-UA-gated waitForPosterBridge; browser about:blank restored; Import _blank; Start on child-ready.
- Unit 261 PASS; Electron import→Present→send + library hydrate + program thumbnail PASS; CI Unit job green.
- completeEpic true. Draft PR #21 stays draft. Jack AppImage READY still residual.

## Epic-006 planning (loop 12) — Jack tip c3a1642 Present hydrate real URL+preload

- Tip `c3a1642` AppImage: NOT READY. Blank-deck+import cold Present flaky 7/12 (~58%) stuck SSR Loading with **preload + real presentId URL** (not about:blank). Library Open→Present primary 3/3 PASS, later 1/2 flake. Tip Electron blank+library PASS.
- Reopened epic (`completeEpic` false / `status` in_progress). Added REQ-010 + todo `fix-appimage-present-hydrate-real-url-preload`; selected that task (task-status id 11).
- Hypothesis for DEV: main-owned present-session loadURL / Remix SSR / present-ready handshake under AppImage FUSE; Start/send may still race; preload may not finish before first paint.

## Epic-006 DEV (fix-appimage-present-hydrate-real-url-preload)

- Root cause: under AppImage/FUSE, main-owned present-session `loadURL` can finish with preload + real presentId while Remix client never boots, leaving SSR `Loading...` forever.
- Fix: `presentHydrateWatchdog.cjs` — after `did-finish-load`, poll for `__posterPresentClientBoot` / `present-ready`; if client never boots within grace, `webContents.reload()` once. Present sets client boot marker; present-session window uses `backgroundThrottling: false`.
- Tests: unit watchdog + main regression; e2e `electron-present-hydrate-stress.spec.ts` (3× cold Open Present with presentId URL + preload assert).
- passesQA false — needs QA + Jack AppImage cold repeats.
- Draft PR #21 only; no product code this persona.

## Epic-006 QA (fix-appimage-present-hydrate-real-url-preload)

- PASS (2026-09-15T01:14:14.000Z): tip `db1c30e` — independent review of presentHydrateWatchdog + `__posterPresentClientBoot` + `backgroundThrottling: false`.
- Unit 274 PASS; Electron present-hydrate-stress + import→Present→send + library hydrate PASS (xvfb).
- All todos passes true → `completeEpic` true. Draft PR #21 stays draft.
- Residual: Jack AppImage cold Present repeats still required for packaged sign-off.

## Epic-004 planning (loop 1)

- Working branch: `cursor/epic-004-song-library` (from main; not gatekeeper PR #23).
- Canonical status: `ralph/task_status.json`. Epic-003 status + qa-report + REQ stubs archived under `ralph/archive/epic-003/`.
- Binding specs: brief Approved v1.2 + Pam UX review under `ralph/specs/`. Brief open questions: none (Pam's listed questions answered in v1.2).
- Codebase: `songs` table stub unused (no book/number); DeckBuilder song import replaces whole deck; songParser has XML + song JSON only (no gathered book JSON); Present staging already title+2 lines — leave alone; no song library UI or slide songId.
- Selected for loop 2 dev: `empty-library-schema`.
- Standing: one task/loop; no PR until completeEpic; max 24 loops; out of scope = bundle books, transcribe copyright songs, change Present staging, replace deck on import.

## Epic-004 DEV (loop 2) — empty-library-schema

- Extended `songs` table with `book` + `number`; migrates legacy tables via ALTER.
- `songs.server.ts`: list/get/upsert (SQLite) + JSON fallback in `library-json.server.ts`.
- Domain `LibrarySong` / `LibrarySongInput`; Remix `GET /library/songs` returns [] when empty.
- No church-book seed. Tests: schema + songs.server + library-json AC-001 / store fields. passes=false.

## Epic-004 QA (loop 3) — empty-library-schema

- PASS AC-001/REQ-001. Independent tsc + Jest 18 PASS; no bundled church books.
- passes=true for empty-library-schema only. Selected next: add-song-by-hand.

## Epic-004 DEV (loop 4) — add-song-by-hand

- Form at `/library/songs/add` (title, book, number, verses); Home "Add a song" link.
- POST `/library/songs/save`; GET `/library/songs?q=` find; `parseVersesText` + `findSongs`.
- AC-002 unit tests (persist find + UI save/find). passes=false.
- Status note: loop-3 QA commit under-wrote task_status; corrected empty-library passes/selected in this commit (not a scope change).

## Epic-004 QA (loop 5) — add-song-by-hand

- PASS AC-002/REQ-002. Independent tsc + Jest 27 PASS.
- Affirmed empty-library-schema passes:true (loop-3; QA-owned).
- Selected next: import-review-screen. Loops used: 5/24.

## Epic-004 DEV (loop 6) — import-review-screen

- Domain `songImport`: gathered book JSON + Poster song XML/JSON; review plan; resolve keep_both/replace/skip + no-lyrics title_only/skip.
- UI `/library/songs/import` + POST import API writes song library only; does not touch open deck / DeckBuilder.
- Single clean song skips review; multi-song checklist all checked; problem sections only when needed.
- Tests: songImport + ImportSongsReview ACs. passes=false.

## Epic-004 QA (loop 7) — import-review-screen

- PASS AC-003/004/005/006/015/018(import)/022. Defaults: all checked, title_only, keep_both. No deck replace.
- Selected next: add-slide-chooser. Loops used: 7/24.

## Epic-004 DEV (loop 8) — add-slide-chooser

- AddSongSlideChooser: Pick from library (default) / Import a file; empty library -> Import or Add by hand.
- Also save to my library checkbox default checked; save only when checked (POST /library/songs/save).
- Inserts song slide after current selection; other slides remain; optional librarySongId on Slide.
- Tests: AddSongSlideChooser + DeckBuilder AC-007. passes=false.

## Epic-004 QA (loop 9) — add-slide-chooser

- PASS AC-007/009/014. Pick default; Also save default on; insert keeps slides.
- Regression: Load song still replaces; Present staging green. Selected library-search-pick. Loops 9/24.

## Epic-004 DEV (loop 10) — library-search-pick

- LibrarySongPicker: search box + optional book filter; GET /library/songs?q=.
- Shared titles show first verse inline; Enter / double-click pick with librarySongId.
- Wired into AddSongSlideChooser pick panel. Tests green. passes=false.

## Epic-004 QA (loop 11) — library-search-pick

- PASS (independent) AC-008/012/016 + REQ-009/014/015/020. Book filter Pam-backed (not invented).
- Insert after current via splice; no deck replace. tsc+Jest green. Selected library-page. Loops 11/24.

## Epic-004 DEV (loop 12) — library-page

- SongLibraryPage at /library/songs: search, book filter, Add/Edit/Delete/Import, used-in-N-decks.
- Links from Home, layout nav, Add song slide chooser. DELETE via /library/songs/delete/:id.
- Edit/delete library-only; seam listDecksUsingSongId for linked-update-decks. passes=false.
- tsc + Jest green. Awaiting QA. Loops 12/24.

## Epic-004 QA (loop 13) — library-page

- PASS AC-017 + REQ-011/021. Main menu nav + Home + Add song slide. Search parity with picker.
- usedInDeckCount accurate once-per-deck. Delete does not touch deck slides (REQ-016 safety).
- Selected linked-update-decks. Loops 13/24.

## Epic-004 DEV (loop 14) — linked-update-decks

- UpdateDecksPrompt: deck checkboxes after edit/delete when used; hand-edit second confirm.
- apply-decks + domain applyLibraryEdit/DeleteToDeck; unused skips prompt; unlinked untouched.
- passes=false. Awaiting QA. Loops 14/24.

## Epic-004 QA (loop 15) — linked-update-decks

- PASS AC-010/013/018 + REQ-012/015/016/023. Persist/open/Present probe green.
- Selected present-unchanged. Loops 15/24.

## Epic-004 DEV (loop 16) — present-unchanged

- Present/ + stagedSongSlide.ts: NO DIFF vs main. PresentTypes: optional librarySongId only.
- AC-011 regression: library-linked + linked-update slides still title then two lines.
- passes=false. Awaiting QA. Loops 16/24.

## Epic-004 QA (loop 17) — present-unchanged

- PASS AC-011 / REQ-013. Independent Present vs main: staging NO DIFF.
- Selected tests-song-library. Loops 17/24.

## Epic-004 DEV (loop 18) — tests-song-library

- AC-001..018 map in ralph/specs/20261007-ac-traceability-song-library.md; uncovered: none.
- Gap fills: AC-008 dimensions + AC-018 unused delete. CI: tsc + Jest 58/364 PASS.
- passes=false. Awaiting QA. Loops 18/24.

## Epic-004 QA (loop 19) — tests-song-library

- PASS: spot-checked AC-001..018 assertions; tsc 0; Jest 58/364; build:remix; remix e2e 52; electron e2e 12.
- All todos pass → completeEpic true. Loops 19/24. No PR (release persona).

## Epic-004 FIX LOOP 1 planning — Iris FAIL PR#26

- Gate: ralph/specs/20261007-iris-gate-pr26-fail.md @ 15ee17d.
- Blocker: library.tsx no Outlet → song routes show coming soon in prod.
- Also: chooser import skips review; JSON restore wipes songs; client process; Apply flake.
- Selected: fix-remix-song-library-outlets. Prior passes kept. completeEpic false. Fix 1/14.

## Epic-004 FIX LOOP 2 DEV — fix-remix-song-library-outlets

- library.tsx: useOutlet() ?? coming soon; loader in library.loader.server.ts.
- library.songs.tsx: Outlet layout; loader in library.songs.loader.server.ts.
- SongLibraryPage on library.songs._index.tsx; REMIX_ROUTE_ID.librarySongs kept for _data.
- Prod e2e: tests/e2e/remix-song-library.spec.ts (server.js) 2 passed. passes=false. Fix 2/14.

## Epic-004 FIX LOOP 3 QA — fix-remix-song-library-outlets FAIL

- server.js UI/_data/Edit/chooser PASS; Present/stagedSongSlide NO DIFF; song-library e2e 2/2.
- Full remix e2e FAIL: mid-suite build:remix vs remix-dev hashes. Same task → DEV. Fix 3/14.

## Epic-004 FIX LOOP 4 DEV — outlets e2e isolation

- Separate playwright.remix.song-library.config.ts + e2e-song-library-webserver.cjs.
- remix-dev config ignores remix-song-library; `test:e2e:remix` runs both sequentially.
- Combined green: 52 + 2. pr.yml uses combined script. passes=false. Fix 4/14.

## Epic-004 FIX LOOP 5 QA — fix-remix-song-library-outlets PASS

- Combined e2e 52+2; pr.yml wired; Present/stagedSongSlide NO DIFF.
- Next: fix-add-slide-import-review. Fix 5/14.

## Epic-004 FIX LOOP 6 DEV — fix-add-slide-import-review

- Shared ImportReviewScreen; chooser import uses review + Also-save via /import.
- DeckBuilder inserts one or many slides after selection. Unit + prod e2e 3 PASS.
- passes=false. Fix 6/14.

## Epic-004 FIX LOOP 7 QA — fix-add-slide-import-review FAIL

- Shared ImportReviewScreen + domain helpers PASS; e2e 52+3 PASS.
- Jest FAIL: config-path-alignment vs compound test:e2e:remix. Same task → DEV. Fix 7/14.

## Epic-004 FIX LOOP 8 DEV — path-alignment + budget 16

- config-path-alignment asserts compound test:e2e:remix → both Playwright configs under tests/e2e/.
- Full Jest 58/365 PASS. Budget raised to 16. passes=false. Fix 8/16.

## Epic-004 FIX LOOP 9 QA — fix-add-slide-import-review PASS

- tsc/Jest 365/e2e 52+3 PASS. Chooser suite 5/5 counted (net +1 explained).
- Next: fix-json-restore-preserve-songs. Fix 9/16.

## Epic-004 FIX LOOP 10 DEV — fix-json-restore-preserve-songs

- JSON restore: omit `songs` → keep existing; key present → replace.
- SQLite `replaceDb`: empty restored songs → re-insert preserved.
- Tests: library-json + db-restore-songs (pre-epic keep + with-songs replace). passes=false. Fix 10/16.
- Housekeeping: side PR #27 closed; commit on epic-004 only.

## Epic-004 FIX LOOP 11 QA — fix-json-restore-preserve-songs PASS

- JSON omit/`songs`/`[]` verified. SQLite row-count overridden deliberate empty → schema heuristic (no songs table or no book/number).
- tsc 0; Jest 59/371. Next: fix-client-process-reference. Fix 11/16.

## Epic-004 FIX LOOP 12 DEV — fix-client-process-reference

- Root cause: song-library route modules imported persistence in the same file as client defaults → db/library-root/`process` in shared client chunk.
- Split import/save/delete/decks/apply-decks into `*.server.ts`; e2e guards pageerror/console. 3/3 PASS. passes=false. Fix 12/16.

## Epic-004 FIX LOOP 13 QA — fix-client-process-reference PASS

- Fresh build; song client audit clean; ?_data actions OK; tsc/Jest 371/e2e 52+3 PASS.
- Next: fix-song-library-apply-flake. Fix 13/16.

## Epic-004 FIX LOOP 14 DEV — fix-song-library-apply-flake

- saveEdit clears busy before fetchSongs after setDeckPrompt; test waits for Apply enabled.
- Isolation 10/10 PASS. passes=false. Fix 14/16.

## Epic-004 FIX LOOP 15 FINAL QA — Iris fix pass PASS

- Flake 10/10; tsc 0; Jest 59/371; build:remix 0; e2e remix 52+3; electron xvfb 12.
- Present/ + stagedSongSlide NO DIFF vs main. All 5 fix tasks + epic todos passes:true.
- completeEpic true. Side PR #27 closed. No merge. Fix 15/16.

## Epic-004 LOOP 16 PLANNING — add-slide-song-scratch-or-linked

- Roy: Add slide > SONG = scratch (blank unlinked) or linked (chooser). Scratch excluded from update prompts.
- Amended: scratch Save to library via ImportReviewScreen; cancel keeps scratch; confirm links (`librarySongId`).
- Spec `20261008-add-slide-song-scratch-or-linked.md`; REQ-024 / AC-019; completeEpic false; budget 16–19.

## Epic-004 LOOP 17 DEV — add-slide-song-scratch-or-linked

- Kind picker + scratch blank slide + SaveScratchSongToLibrary (ImportReviewScreen).
- Unit + song-library prod e2e updated. passes false (QA next). Present/stagedSongSlide untouched.

## Epic-004 LOOP 18 FINAL QA — PASS + completeEpic

- AC-019 six items verified (prod e2e + cancel spot + unit exclusion).
- tsc 0; Jest 59/375; build:remix 0; e2e remix 52+4; electron xvfb 12.
- Present/ + stagedSongSlide NO DIFF vs main. PR #26 only. completeEpic true. No merge.


## Epic-004 LOOP 19 DEV — fix-iris-regate-followups

- Iris re-gate bc4320e: apply-decks flake (UpdateDecksPrompt effect reset) + move routes/*.server.ts to remix/server/.
- completeEpic false; passes false. 45f10ff CI noted/ignored.
