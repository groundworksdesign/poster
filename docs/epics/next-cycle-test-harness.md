# Next-cycle regression test harness

Authoritative pass/fail assertions for the next-cycle regression fixes (Epic 005).
This file maps each confirmed defect to the **real test file and test name** that fails on
today's bug, plus the smoke specs and CI gates. Jack owns sign-off on this harness before
the cycle PR merges.

## Items and defect → would-have-caught map

| Item | Defect (would-have-caught) | Unit / integration (fails pre-fix) | Smoke / component (fails pre-fix) |
|------|---------------------------|------------------------------------|-----------------------------------|
| A | **End leaves a titled slide on program** — `end` must send a directed blank to the selected Present only, blank program-out, Start resumes at slide 1 | `src/__tests__/posterSessionGraph.test.js` → "blank payload is directed only to the selected Present child", "blank payload is replayed when its Present child becomes ready"; `src/Present/applyPresentPayload.test.ts` → blank clears the viewport | `e2e/remix-present-end.spec.ts` → "End blanks Present and Start resumes at the first slide" |
| B | **Theme lost after quit + relaunch** — durable theme id under user prefs, restored before paint, live apply stays green | `src/utils/themePrefs.test.js` → "round-trips valid themes in theme.json", "falls back safely for missing, malformed, and invalid values", "resolves the default preference path under the user home"; `src/utils/useTheme.unit.test.tsx` → "restores stored theme after remount", "syncs when another window writes poster-theme"; `src/rootThemeBootstrap.test.ts` → applies/ignores pre-paint values | `e2e/electron-theme-relaunch.spec.ts` → "restores theme after a full process relaunch"; `e2e/remix-theme-persist.spec.ts` → cross-window + new-context restore |
| C | **Closing a Present leaves a stale UUID** — window close removes child, deck-event `child-closed` emitted once, closed id never sent to | `src/__tests__/posterSessionGraph.test.js` → "window-close unregister removes the child and notifies the deck once", "repeated window-close events are idempotent and preserve other children", "explicit close is idempotent and never sends to the closed child"; `src/__tests__/electron-main.regression.test.js` → window lifecycle; `src/__tests__/homeWindowPolicy.test.js` → bare-/present-session policy | `e2e/remix-present-close.spec.ts` → "closing a Present window removes it from the deck session list" |
| D | **On-program thumbnail wrong fidelity + placement** — preview derived from the same program state as present-push (blank after End), placed under the Presentation controls region, not the metadata block | `src/Present/programThumbnail.test.ts` → "returns null when nothing is on program", "includes the current song lyric pair", "keeps message and green-screen state"; `src/Present/programThumbnail.integration.test.tsx` → "Present clears its viewport and thumbnail state for a blank payload", "Present reports the exact program state for navigation, sends, messages, lyrics, and green screen"; `src/Deck/DeckBuilder.unit.test.tsx` → "places the on-program preview in Presentation controls" | `e2e/remix-program-thumbnail.spec.ts` → "deck shows program thumbnail after Present receives a send" |
| E | **Library not durable** — default `~/.poster`, one-time cwd migration (SQLite + JSON), settings re-point leaves old folder untouched, survives cwd wipe / relaunch | `src/__tests__/library-root.server.test.ts` → defaults to `HOME/.poster`, migration once (SQLite, JSON, WAL sidecars, populated-dest skip), malformed/invalid settings fallback, re-point leaves old folder, rejects file path; `src/__tests__/library-json.server.test.ts` → JSON store upsert/list/open/delete; `src/integration/library-survive-cwd-wipe.test.ts` + `src/integration/library-json-survive-cwd-wipe.test.ts` → data survives working-directory deletion | `e2e/remix-library-relaunch.spec.ts` → "library entries survive a full server quit and relaunch in default HOME library"; `e2e/remix-library-repoint.spec.ts` → "changing the library folder re-points without moving the old folder" |
| Guard | Home exposes no bare "Open Present" — deck and Present-session only | `src/__tests__/homeWindowPolicy.test.js` → `present-bare` denied / deck allowed; `src/__tests__/electron-main.regression.test.js` → "never creates a second Home" | `e2e/remix-single-home.spec.ts` → "Home exposes no bare Open Present action or presenter route", "Present window is created by deck Open Present, not Home", "bare /presentation shows connect guidance" |

## Fixtures used by the suites

| Fixture | Real equivalent |
|---------|-----------------|
| `withTempHome()` — isolated `HOME` sandbox | Inline `fs.mkdtempSync(os.tmpdir()...)` + `process.env.HOME` swap + `jest.spyOn(os, 'homedir')` in `library-root.server.test.ts`, `library-survive-cwd-wipe.test.ts`, and the e2e library specs. |
| `mockWebContentsSend()` — recorded directed sends | Delivery-spy (`makeDeliver`) in `src/__tests__/posterSessionGraph.test.js` records `{ channel, payload }` per peer; never touches a real BrowserWindow. |
| `fakeLibraryRoot()` / `seedCwdLibrary()` — seeded legacy data | `fs.mkdtempSync` sandboxes that plant `cwd/poster.sqlite` (+`-wal`/`-shm`) or `cwd/poster.library.json` under `src/__tests__/library-root.server.test.ts`. |
| Electron smoke isolation | `e2e/electron-theme-relaunch.spec.ts` launches via Playwright `_electron` with `--user-data-dir=<temp>` and `HOME=<temp>` so relaunch tests never touch a real profile. |

## CI gates (pull request)

- **Unit + integration (always, every PR):** `.github/workflows/pr.yml` job `unit-integration` →
  `pnpm exec react-scripts test --watchAll=false --runInBand` (all suites above; 38 suites /
  226 tests).
- **Remix Playwright smoke (every PR):** job `remix-e2e` → `pnpm run test:e2e:remix`
  (`playwright.remix.config.ts`, `remix dev` webServer). Covers A, C, D, E smoke and the Home
  guard.
- **Electron relaunch smoke (every PR):** job `electron-smoke` → `xvfb-run -a pnpm run
  test:e2e:electron` (`playwright.electron.config.ts`). Covers B (theme relaunch) at full
  process/quit level.
- **Mac manual (documented, not a CI gate):** Item D pixel-fidelity spot-check once the Mac
  build exists; Linux CI asserts content markers, not bit-identical pixels.

## Fixture / environment notes

- Electron relaunch smoke requires the Remix build first (`pnpm run build:remix`) and a real
  display (CI: `xvfb-run`).
- `library-*` integration tests skip gracefully when no SQLite driver is available; CI rebuilds
  `better-sqlite3` so the real driver path always runs there.
- `HOME` must always be pinned in prefs/library tests — AppImage extract-dir and cwd must not
  be able to masquerade as the durable root.

Status: green locally (38 jest suites / 226 tests, 52 remix smoke, electron theme-relaunch
smoke) on the cycle branch.