# Poster next-cycle plan: defect fixes + library persistence

Status: **Shipped — Items A–E product fixes (tasks 1–6), the regression harness (task 7), acceptance documentation sync (task 8), and packaged/Electron acceptance evidence (task 9) are done**. See the re-anchored plan in [`ralph/epic.md`](../../ralph/epic.md).  
Owners: Manny (impl / Ralph), Jack (test plan + harness), Moe (confirm / architecture challenge)  
Baseline confirm: Moe Linux **v0.1.7-pr.15** + Roy Mac notes (2026-09-06)  
Auto-update: remains **parked** (`auto-update-plan.md`) until after this cycle lands.

## Status

| Item | Deliverable | Status |
|------|-------------|--------|
| A | End blanks Present (directed blank, viewport clears, Start resumes slide 1, deck program state blank) | **Shipped** |
| B | Theme persists across quit + relaunch (`~/.poster/theme.json`, restored before paint, live apply) | **Shipped** |
| C | Closing Present unregisters the child; closed ids never sent to; close one-of-N leaves others | **Shipped** |
| D | On-program thumbnail = true program-out preview, placed in the Presentation controls region | **Shipped** |
| E | Durable library: default `~/.poster`, one-time cwd migration, re-point leaves old, survives reinstall | **Shipped** |
| Guard | Home has no bare “Open Present” CTA | **Shipped** |
| 7 | Regression harness + PR CI (unit/integration, Remix smoke, Electron relaunch smoke) | **Done (green locally)** |
| 8 | Acceptance documentation sync (this plan, `requirements.md`, `README.md`, `ralph/epic.md`) | **Done** |
| 9 | Packaged/Electron acceptance evidence for key flows | **Done** |

The per-item sections below keep the **acceptance criteria** as the definition of the shipped behavior and map each to its **real** test suites (see [`next-cycle-test-harness.md`](./next-cycle-test-harness.md)).

## Goals (as shipped)

1. Fix confirmed Present/deck regressions so they cannot return — implemented in tasks 1–6.
2. Ship durable presentations library storage (`~/.poster` default + migrate + settings) — implemented in task 5.
3. Gate every item with **unit tests** where logic is pure/main-owned, plus **regression** (Playwright / Electron smoke) for UI and cross-window behavior — implemented in task 7.

## Out of scope

- Auto-update / electron-updater (parked).
- Home “Open Present” removal (already **PASS** on v0.1.7-pr.15 — guarded as a regression, not re-implemented).
- New Present features beyond the items below.

---

## Item A — End blanks Present (shipped)

**Bug (fixed):** Start / Next / Previous / Go worked; **End** left Present on the last titled slide (e.g. black + “Title”) instead of a blank/cleared program-out.

**Acceptance (shipped)**

- End sends a directed clear/blank to the target Present child(ren) only.
- Present viewport shows blank (no title/body slide content).
- Deck “On program” reflects blank after End (via the shared program state; see Item D).
- Start after End shows first slide again.

**Coverage (real suites)**

| Suite / file | Layer | Assertion that failed on the original bug |
|-------------------------|-------|-------------------------------------|
| `src/__tests__/posterSessionGraph.test.js` → blank payload cases | Unit | `end` builds a blank payload directed only to the selected Present child; blank is replayed when that child becomes ready. |
| `src/Present/applyPresentPayload.test.ts` → blank clears the viewport | Unit | Blank payload clears the Present viewport (no residual title/body). |
| `e2e/remix-present-end.spec.ts` | Smoke | Open Present → Start → End → Present DOM has no title/body slide content; Start resumes at the first slide. |

---

## Item B — Theme persistence across quit + relaunch (shipped)

**Bug (fixed):** Theme applied live to Home / deck / Present in-session; after full quit + relaunch, Home returned to Light.

**Acceptance (shipped)**

- Selected theme id is persisted to `**~/.poster/theme.json**` (Electron and Remix share this durable, user-owned path — not wiped by AppImage cwd).
- On relaunch, Home / deck / Present all restore the same theme before first paint (early bootstrap script).
- Changing theme still applies live to open windows.

**Coverage (real suites)**

| Suite / file | Layer | Assertion that failed on the original bug |
|-------------------------|-------|-------------------------------------|
| `src/utils/themePrefs.test.js` | Unit | get/set round-trip; missing → default (`light`); invalid id → safe fallback; prefs path resolves under user home (`.poster/theme.json`). |
| `src/utils/useTheme.unit.test.tsx`, `src/rootThemeBootstrap.test.ts` | Unit | Restores stored theme after remount / pre-paint; syncs when another window writes the theme. |
| `e2e/electron-theme-relaunch.spec.ts` | Smoke | Set Tokyo Night → quit → relaunch → Home `data-theme` / class matches; not Light. |
| `e2e/remix-theme-persist.spec.ts` | Smoke | Cross-window + new-context restore (live path stays green). |

---

## Item C — Closing Present removes it from deck child list (shipped)

**Bug (fixed):** Closing Present via window **X** left UUID in deck “Present windows” list (no `child-closed` / list remove).

**Acceptance (shipped)**

- Window close (and any explicit Close control) unregisters the child from the deck session graph.
- Deck UI list updates without stale UUID.
- Directed send “All children” / per-child targets no longer include the closed id.
- Closing one of N Presents leaves the others intact.

**Coverage (real suites)**

| Suite / file | Layer | Assertion that failed on the original bug |
|-------------------------|-------|-------------------------------------|
| `src/__tests__/posterSessionGraph.test.js` → close cases | Unit | Window-close removes the child and emits `child-closed` once; repeated closes idempotent; explicit close never sends to the closed child; close-one-of-N preserves others. |
| `src/__tests__/electron-main.regression.test.js`, `src/__tests__/homeWindowPolicy.test.js` | Unit | Window lifecycle + Present-only session policy. |
| `e2e/remix-present-close.spec.ts` | Smoke | Open Present → close via window X → deck Present list has no that UUID. |

---

## Item D — On-program thumbnail: fidelity + placement (shipped)

**Bug (fixed):** (1) Thumbnail did **not** look exactly like what’s on Present (not a true program-out preview). (2) Placement wrong: appeared above deck metadata instead of with the Presentation slide controls.

**Acceptance (shipped)**

- Thumbnail is a true program-out preview of what Present is showing (including blank after End).
- UI placement: adjacent to / under the Presentation controls bar, not in the metadata block.
- Updates on Start / Next / Previous / Go / End / Send.

**Coverage (real suites)**

| Suite / file | Layer | Assertion that failed on the original bug |
|-------------------------|-------|-------------------------------------|
| `src/Present/programThumbnail.test.ts` | Unit | Preview derived from the same program state as present-push; null when nothing on program; includes lyric pair / message / green-screen; End → blank preview payload. |
| `src/Present/programThumbnail.integration.test.tsx` | Integration | Present clears viewport + thumbnail state for a blank payload; reports exact program state across navigation, sends, messages, lyrics, green screen. |
| `src/Deck/DeckBuilder.unit.test.tsx` | Unit / component | `data-testid="on-program"` sits in the Presentation controls region, not the metadata block. |
| `e2e/remix-program-thumbnail.spec.ts` | Smoke | Deck shows program thumbnail after Present receives a send; blank after End. |
| Manual Mac matrix | Manual | Content equivalence on Mac build (pixel-perfect optional). Linux CI does not gate “exact look.” |

---

## Item E — Presentations library persistence (`~/.poster`) (shipped)

**Locked product direction (all shipped)**

- Default directory: `~/.poster`.
- First run: **default `~/.poster`** (no forced picker); optional **Change…** later via settings.
- One-time migration from cwd `poster.sqlite` / JSON fallback.
- Survives updates and full uninstall/reinstall **as far as the OS allows** (user-owned dir outside app/uninstaller wipe).

**Acceptance (shipped)**

- Fresh install with no prior data creates/uses **`~/.poster` by default**; optional “Change...” in settings (no forced first-run picker).
- Existing cwd DB/JSON migrates once (marker kept in the durable home); second launch does not duplicate/clobber; source is never deleted.
- Changing library folder via setting **re-points** to the new path (persisted in `library-settings.json` under the durable home) and **leaves the old folder untouched** (no automatic move/copy).
- Uninstalling the app package does not delete `~/.poster` contents.
- Library lists decks after relaunch / “reinstall” simulation (wipe install dir, keep `~/.poster`).

**Coverage (real suites)**

| Suite / file | Layer | Assertion that failed without durable library |
|-------------------------|-------|-----------------------------------------------|
| `src/__tests__/library-root.server.test.ts` | Unit | Fresh install resolves default `$HOME/.poster` (temp HOME); `~` expand; migration once (SQLite, JSON, WAL sidecars, populated-dest skip, marker); malformed/invalid settings fallback; re-point leaves old folder; rejects file paths. |
| `src/__tests__/library-json.server.test.ts` | Unit | JSON store upsert/list/open/delete. |
| `src/integration/library-survive-cwd-wipe.test.ts`, `src/integration/library-json-survive-cwd-wipe.test.ts` | Integration | Save deck under library → wipe cwd → reopen store → deck listed. |
| `e2e/remix-library-relaunch.spec.ts` | Smoke | **Default** `~/.poster` (no picker) → save → quit → relaunch → deck present. |
| `e2e/remix-library-repoint.spec.ts` | Smoke | Change… to new folder → app uses new root; old `~/.poster` (or prior path) still on disk unchanged. |

---

## Regression guard (PASS — kept green)

| Guard | Assert |
|-------|--------|
| Home has no “Open Present” | Home CTAs are Open Presentation (deck) / builders / import only; Present opens from deck; bare `/presentation` shows connect guidance. Covered by `src/__tests__/homeWindowPolicy.test.js`, `src/__tests__/electron-main.regression.test.js`, `e2e/remix-single-home.spec.ts`. |
| Start / Previous / Next / Go | Remain green alongside End fix (Item A). |

---

## Test strategy (Jack) — shipped

Authoritative suite map: [`next-cycle-test-harness.md`](./next-cycle-test-harness.md) — the “would-have-caught” table maps every confirmed defect to the **real** test file and test name, plus fixtures and CI gates.

### Principles (as shipped)

- Every defect has ≥1 unit test that fails on the pre-fix behavior.
- Prefer main/session pure functions + mock `webContents.send` over flaky GUI.
- Playwright / Electron smoke for cross-window + quit/relaunch persistence.
- CI (every PR):
  - `unit-integration`: `pnpm exec react-scripts test --watchAll=false --runInBand` (+ `tsc --noEmit`).
  - `remix-e2e`: `pnpm run test:e2e:remix` (Remix dev webServer) — A, C, D, E smoke + Home guard.
  - `electron-smoke`: `xvfb-run -a pnpm run test:e2e:electron` — B theme relaunch at full process/quit level.
- Manual Mac: Item D fidelity + theme/library spot-check once the Mac build exists. Not a substitute for unit coverage.

### Suite map (real, shipped)

| Item | Unit / integration suites | Smoke |
|------|---------------------------|-------|
| A End blank | `src/__tests__/posterSessionGraph.test.js`, `src/Present/applyPresentPayload.test.ts` | `e2e/remix-present-end.spec.ts` |
| B Theme | `src/utils/themePrefs.test.js`, `src/utils/useTheme.unit.test.tsx`, `src/rootThemeBootstrap.test.ts` | `e2e/electron-theme-relaunch.spec.ts`, `e2e/remix-theme-persist.spec.ts` |
| C Close list | `src/__tests__/posterSessionGraph.test.js`, `src/__tests__/electron-main.regression.test.js`, `src/__tests__/homeWindowPolicy.test.js` | `e2e/remix-present-close.spec.ts` |
| D Thumbnail | `src/Present/programThumbnail.test.ts`, `src/Present/programThumbnail.integration.test.tsx`, `src/Deck/DeckBuilder.unit.test.tsx` | `e2e/remix-program-thumbnail.spec.ts` + Mac manual |
| E Library | `src/__tests__/library-root.server.test.ts`, `src/__tests__/library-json.server.test.ts`, `src/integration/library-survive-cwd-wipe.test.ts`, `src/integration/library-json-survive-cwd-wipe.test.ts` | `e2e/remix-library-relaunch.spec.ts`, `e2e/remix-library-repoint.spec.ts` |
| Guard | `src/__tests__/homeWindowPolicy.test.js`, `src/__tests__/electron-main.regression.test.js` | `e2e/remix-single-home.spec.ts` |

### Fixtures (real equivalents)

| Fixture | Use |
|---------|-----|
| `withTempHome()` | `fs.mkdtempSync(os.tmpdir()...)` + `process.env.HOME` swap + `jest.spyOn(os, 'homedir')` — used by B prefs root + E library default suites. |
| `mockWebContentsSend()` | Delivery-spy (`makeDeliver`) in `src/__tests__/posterSessionGraph.test.js` records `{ channel, payload }` per peer; never hits a real BrowserWindow. Used by A/C directed push. |
| `fakeLibraryRoot()` / `seedCwdLibrary()` | `fs.mkdtempSync` sandboxes that plant `cwd/poster.sqlite` (+`-wal`/`-shm`) or `cwd/poster.library.json` under `src/__tests__/library-root.server.test.ts`. |
| Electron smoke launch | Playwright `_electron` with `--user-data-dir=<temp>` and `HOME=<temp>` so relaunch tests don’t touch real profile (`e2e/electron-theme-relaunch.spec.ts`). |

### CI vs Mac matrix

| Check | Linux CI unit | Linux CI smoke | Mac manual |
|-------|---------------|----------------|------------|
| A End blank | Required | Required (remix smoke) | Optional confirm |
| B Theme persist | Required (path + store) | Required relaunch (electron smoke) | Spot-check |
| C Close removes child | Required | Required (remix smoke) | Optional |
| D Preview model + placement | Required | Smoke content match | **Fidelity** (content equivalence) |
| E Library path/migrate | Required | Required relaunch / re-point / cwd-wipe | Spot-check survive |
| Home no Open Present | Required (policy) | Guard in smoke | — |

### Definition of Done (cycle PR) — status

- [x] Roy explicit **go** before implementation (given 2026-09-06).
- [x] Items A–E acceptance met on shipped build (tasks 1–6 closed).
- [x] All suites in the map exist and are green in CI (unit + integration + Remix smoke + Electron relaunch smoke; harness reports 38 jest suites / 229 tests and 52 Remix smoke green locally, 8 Electron packaged smoke).
- [x] Harness “would-have-caught” rows mapped to real test names in [`next-cycle-test-harness.md`](./next-cycle-test-harness.md).
- [x] **Jack confirm (merge gate):** harness signed off.
- [x] Packaged/Electron smoke evidence collected for End blank, close-list cleanup, theme relaunch, library default `~/.poster` + re-point leave-old, and Home no-Open-Present (`ralph/qa-report.md`) — task 9.

---

## Implementation order (shipped)

1. **C** session child cleanup (unblocks correct directed-send targets).
2. **A** End blank (same present-push / program-state path).
3. **D** thumbnail fidelity + placement (depends on shared program state from A).
4. **B** theme prefs durability (shared prefs root with E).
5. **E** library `~/.poster` + migration + setting.

## Risks (as shipped / carried)

- ~~Theme prefs writing to wrong path~~ — resolved: `~/.poster/theme.json` is the single durable store (Electron + Remix).
- Thumbnail “exact look” may need capture from Present contents vs re-render; fidelity bar = **same program payload / content markers**, not bit-identical pixels (no visual-diff gate in CI unless Roy asks).
- Closing Home still kills all windows — out of scope unless Roy expands.
- Electron quit/relaunch smoke can be flaky — mitigated with isolated `--user-data-dir`; AppImage cwd must not fool prefs/library path tests (`HOME` pinned via fixtures).
- POC `mainSwitch` close tests are **not** sufficient for production Item C — production harness targets the real `posterSessionGraph` module.

## Locked decisions (Roy, 2026-09-06)

1. Library folder change: **re-point and leave old** (no automatic move).
2. First-run: **default `~/.poster`** with optional **“Change…”** (no forced picker).
3. Impl order: **either is fine** — default C → A → D → B → E.
4. Merge gate: **Jack confirm required before merge** (not Moe packaged confirm as a hard gate; Moe still welcome for packaged smoke).

---

## References

- Regression harness (authoritative suite map): [`next-cycle-test-harness.md`](./next-cycle-test-harness.md)
- Acceptance checklist: [`requirements.md`](../../requirements.md)
- Packaged acceptance evidence (task 9): [`ralph/qa-report.md`](../../ralph/qa-report.md)
- Parked auto-update: `auto-update-plan.md`
- Epic-004 context: directed send, theme persist, program thumbnail (repo `docs/epics`)