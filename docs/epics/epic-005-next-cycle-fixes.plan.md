# Poster next-cycle plan: defect fixes + library persistence

Status: **GO — Ralph via headless izep/ralph-gui** (Roy 2026-09-06; cloud agent cancelled — don’t wait on bc-47ced3f7)  
Owners: Manny (impl / Ralph), Jack (test plan + harness), Moe (confirm / architecture challenge)  
Baseline confirm: Moe Linux **v0.1.7-pr.15** + Roy Mac notes (2026-09-06)  
Auto-update: remains **parked** (`auto-update-plan.md`) until after this cycle lands.

## Goals

1. Fix confirmed Present/deck regressions so they cannot return.
2. Ship durable presentations library storage (`~/.poster` default + migrate + settings).
3. Gate every item with **unit tests** where logic is pure/main-owned, plus **regression** (Playwright / packaged smoke) for UI and cross-window behavior.

## Out of scope

- Auto-update / electron-updater (parked).
- Home “Open Present” removal (already **PASS** on v0.1.7-pr.15 — keep a regression guard only).
- New Present features beyond the items below.

---

## Item A — End blanks Present

**Bug:** Start / Next / Previous / Go work; **End** leaves Present on the last titled slide (e.g. black + “Title”) instead of a blank/cleared program-out.

**Acceptance**

- End sends a directed clear/blank to the target Present child(ren) only.
- Present viewport shows blank (no title/body slide content).
- Deck “On program” reflects blank after End (once Item D lands).
- Start after End shows first slide again.

**Unit / automated tests (required)**

| Suite / file (proposed) | Layer | Assertion that fails on today’s bug |
|-------------------------|-------|-------------------------------------|
| `tests/unit/main/present-commands.test.ts` → `describe("end → blank")` | Unit | `end` builds blank/clear payload (`kind: "blank"` or equivalent); `webContents.send` mock called only for selected presentId(s); zero sends if no children. |
| same → `describe("program state after end")` | Unit | Session program state is blank/null after End; Start resets index to first slide and pushes non-blank payload. |
| `tests/smoke/present-end.spec.ts` | Smoke | Open Present → Start → End → Present DOM has no title/body slide content (blank program-out). Fail screenshot: `smoke-end-not-blank.png`. |

---

## Item B — Theme persistence across quit + relaunch

**Bug:** Theme applies live to Home / deck / Present in-session; after full quit + relaunch, Home returns to Light. Home-only close/reopen path blocked (closing Home closes all windows) — treat full quit+relaunch as the must-pass path; document Home-close behavior separately if product wants app stay-alive later.

**Acceptance**

- Selected theme id persisted to durable prefs (stable location under user library / app prefs — not wiped by AppImage cwd).
- On relaunch, Home / deck / Present all restore the same theme before first paint when possible.
- Changing theme still applies live to open windows.

**Unit / automated tests (required)**

| Suite / file (proposed) | Layer | Assertion that fails on today’s bug |
|-------------------------|-------|-------------------------------------|
| `tests/unit/prefs/theme-store.test.ts` | Unit | get/set round-trip; missing → default; invalid id → safe fallback. |
| same → `describe("prefs root")` | Unit | With `HOME` = temp dir, prefs path is under user-owned root (`~/.poster` or agreed prefs), **not** `process.cwd()` / AppImage extract dir. |
| `tests/smoke/theme-relaunch.spec.ts` | Smoke | Set Tokyo Night → quit → relaunch → Home `data-theme` / class matches; not Light. |
| `tests/smoke/theme-live-apply.spec.ts` | Smoke | Deck+Present open → change theme → all windows update (live path stays green). |

---

## Item C — Closing Present removes it from deck child list

**Bug:** Closing Present via window **X** leaves UUID in deck “Present windows” list (no `child-closed` / list remove).

**Acceptance**

- Window close (and any explicit Close control) unregisters the child from the deck session graph.
- Deck UI list updates without stale UUID.
- Directed send “All children” / per-child targets no longer include the closed id.
- Closing one of N Presents leaves the others intact.

**Unit / automated tests (required)**

| Suite / file (proposed) | Layer | Assertion that fails on today’s bug |
|-------------------------|-------|-------------------------------------|
| `tests/unit/main/session-graph-close.test.ts` → `onPresentClosed` | Unit | Child removed from session list; second call idempotent; deck-event `child-closed` emitted once. |
| same → `describe("send after close")` | Unit | After remove, directed send / all:true never calls `webContents.send` for closed id. |
| same → `describe("close one of N")` | Unit | Close A leaves B registered and sendable. |
| `tests/smoke/present-close-list.spec.ts` | Smoke | Open Present → close via window X → deck Present list has no that UUID. Fail shot: `smoke-stale-present-uuid.png`. |

---

## Item D — On-program thumbnail: fidelity + placement

**Bug (refined):** Not “empty.” (1) Thumbnail does **not** look exactly like what’s on Present (not a true program-out preview). (2) Placement wrong: should sit **with Presentation slide controls** (Start / Previous / Next / End / Go), **not** above deck metadata. Linux packaged build showed a visible thumb; Mac/UX notes drive the FAIL.

**Acceptance**

- Thumbnail is a true program-out preview of what Present is showing (including blank after End).
- UI placement: adjacent to / under the Presentation controls bar, not in the metadata block.
- Updates on Start / Next / Previous / Go / End / Send.

**Unit / automated tests (required)**

| Suite / file (proposed) | Layer | Assertion that fails on today’s bug |
|-------------------------|-------|-------------------------------------|
| `tests/unit/deck/program-preview-model.test.ts` | Unit | Preview derived from same program state as present-push; End → blank preview payload (catches fidelity-as-wrong-source). |
| `tests/unit/deck/program-preview-placement.test.ts` | Unit / component | `data-testid="on-program"` is under Presentation controls region, **not** metadata block. |
| `tests/smoke/on-program-preview.spec.ts` | Smoke | After Send/Start, preview markers match Present; after End, preview blank. |
| Manual Mac matrix | Manual | Content equivalence on Mac build (pixel-perfect optional). Linux CI does not gate “exact look.” |

---

## Item E — Presentations library persistence (`~/.poster`)

**Locked product direction**

- Default directory: `~/.poster`.
- First run: **default `~/.poster`** (no forced picker); optional **Change…** later via settings.
- One-time migration from cwd `poster.sqlite` / JSON fallback.
- Must survive updates and full uninstall/reinstall **as far as the OS allows** (user-owned dir outside app/uninstaller wipe).

**Acceptance**

- Fresh install with no prior data creates/uses **`~/.poster` by default**; optional “Change…” in settings (no forced first-run picker).
- Existing cwd DB/JSON migrates once; second launch does not duplicate/clobber.
- Changing library folder via setting **re-points** to the new path and **leaves the old folder untouched** (no automatic move/copy).
- Uninstalling the app package does not delete `~/.poster` contents.
- Library lists decks after relaunch / “reinstall” simulation (wipe install dir, keep `~/.poster`).

**Unit / automated tests (required)**

| Suite / file (proposed) | Layer | Assertion that fails without durable library |
|-------------------------|-------|-----------------------------------------------|
| `tests/unit/library/resolve-root.test.ts` | Unit | Fresh install resolves default `$HOME/.poster` (temp HOME); `~` expand. |
| `tests/unit/library/migrate.test.ts` | Unit | cwd sqlite → library; cwd JSON → library; skip if dest populated; migration marker set; second run no duplicate. |
| `tests/unit/library/settings-path.test.ts` | Unit | Read/write library path; invalid path handling; **re-point** to new root leaves old dir files untouched (no move/delete). |
| `tests/integration/library-survive-cwd-wipe.test.ts` | Integration | Save deck under library → wipe cwd → reopen store → deck listed. |
| `tests/smoke/library-relaunch.spec.ts` | Smoke | **Default** `~/.poster` (no picker) → save → quit → relaunch → deck present. |
| `tests/smoke/library-repoint.spec.ts` | Smoke | Change… to new folder → app uses new root; old `~/.poster` (or prior path) still on disk unchanged. |

---

## Regression guard (already PASS — keep green)

| Guard | Assert |
|-------|--------|
| Home has no “Open Present” | Home CTAs are Open Presentation (deck) / builders / import only; Present opens from deck. |
| Start / Previous / Next / Go | Remain green alongside End fix (Item A). |

---

## Test strategy (Jack) — hardened

Authoritative harness detail: [`next-cycle-test-harness.md`](./next-cycle-test-harness.md) (pass/fail assertions that would have caught today’s bugs).

### Principles

- **Every defect has ≥1 unit test that fails on the pre-fix behavior** (see harness “would-have-caught” table).
- Prefer main/session pure functions + mock `webContents.send` over flaky GUI.
- Playwright / Electron smoke for cross-window + quit/relaunch persistence.
- **CI (every PR):** all new unit + integration tests under `tests/unit/**` and `tests/integration/**`.
- **CI (PR or nightly — prefer PR if <10m):** smoke specs A/C End+close; theme relaunch + library relaunch when Electron harness is stable.
- **Manual Mac:** Item D fidelity + theme/library spot-check once Mac build exists. Not a substitute for unit coverage.
- No “manual only” for A–C and E core paths.

### Suite map (concrete names)

| Item | Unit / integration suites | Smoke |
|------|---------------------------|-------|
| A End blank | `present-commands.test.ts`, program-state cases | `present-end.spec.ts` |
| B Theme | `theme-store.test.ts` | `theme-relaunch.spec.ts`, `theme-live-apply.spec.ts` |
| C Close list | `session-graph-close.test.ts` | `present-close-list.spec.ts` |
| D Thumbnail | `program-preview-model.test.ts`, `program-preview-placement.test.ts` | `on-program-preview.spec.ts` + Mac manual |
| E Library | `resolve-root.test.ts`, `migrate.test.ts`, `settings-path.test.ts` (incl. re-point leave-old), `library-survive-cwd-wipe.test.ts` | `library-relaunch.spec.ts`, `library-repoint.spec.ts` |
| Guard | — | Home has no Open Present (existing Moe check → keep as smoke assert) |

Paths above are **proposed** under repo `tests/`; align to real module paths when impl lands (mirror POC style in `poster-directed-send-poc/src/mainSwitch.test.js`).

### Fixtures (required)

| Fixture | Use |
|---------|-----|
| `withTempHome()` | Sets `HOME` (and XDG if needed) to `os.tmpdir()` sandbox; cleans up. Used by B prefs root + E library default. |
| `mockWebContentsSend()` | Records `{ presentId, channel, payload }`; never hits real BrowserWindow. Used by A/C directed push. |
| `fakeLibraryRoot()` | Empty dir + optional seeded `poster.sqlite` / JSON for migrate tests. |
| `seedCwdLibrary()` | Places cwd sqlite/JSON in temp cwd to prove migrate-once. |
| Electron smoke launch | Packaged or `electron .` with `--user-data-dir=<temp>` so relaunch tests don’t touch real profile. |

### CI vs Mac matrix

| Check | Linux CI unit | Linux CI/smoke | Mac manual |
|-------|---------------|----------------|------------|
| A End blank | Required | Required | Optional confirm |
| B Theme persist | Required (path + store) | Required relaunch | Spot-check |
| C Close removes child | Required | Required | Optional |
| D Preview model + placement | Required | Smoke content match | **Fidelity** (content equivalence) |
| E Library path/migrate | Required | Required relaunch / cwd-wipe | Spot-check survive |
| Home no Open Present | — | Guard in smoke | — |

### Definition of Done (cycle PR)

- [ ] Roy explicit **go** before any implementation (Ralph / Sr-dev complete-picture rule).
- [ ] Items A–E acceptance met on packaged build.
- [ ] All suites in the map exist and are green in CI (unit + integration).
- [ ] Smoke: End blank, theme relaunch, child-list cleanup, library survive wipe-cwd — green or attached checklist + fail screenshots on failure.
- [ ] Harness “would-have-caught” rows mapped to real test names in PR description.
- [ ] **Jack confirm (merge gate):** harness DoD in [`next-cycle-test-harness.md`](./next-cycle-test-harness.md) signed off by Jack before merge.
- [ ] Moe packaged smoke optional/welcome (not a hard merge gate).

---

## Proposed implementation order

1. **C** session child cleanup (unblocks correct directed-send targets).
2. **A** End blank (same present-push / program-state path).
3. **D** thumbnail fidelity + placement (depends on shared program state from A).
4. **B** theme prefs durability (may share prefs root with E).
5. **E** library `~/.poster` + migration + setting (largest; last so prefs root is settled).

Or: **E first** if Roy prioritizes data survival over Present UX — call out in go message.

## Risks

- Theme prefs today may already be intended durable but writing to wrong path (cwd vs userData vs `~/.poster`) — fix path, don’t invent a second store.
- Thumbnail “exact look” may need capture from Present contents vs re-render; fidelity bar = **same program payload / content markers**, not bit-identical pixels (no visual-diff gate in CI unless Roy asks).
- Closing Home still kills all windows — out of scope unless Roy expands.
- **Test risks (Jack):** Electron quit/relaunch smoke flaky without isolated `--user-data-dir`; AppImage cwd fools prefs/library path tests if `HOME` fixture omitted; Item D Mac-only FAIL vs Linux PASS means CI green can still miss Mac placement/fidelity — keep Mac manual in DoD for D.
- POC `mainSwitch` already has “close drops present from list” — production may not share that path; harness must target **real** main session module, not only POC.

## Locked decisions (Roy, 2026-09-06)

1. Library folder change: **re-point and leave old** (no automatic move).
2. First-run: **default `~/.poster`** with optional **“Change…”** (no forced picker).
3. Impl order: **either is fine** — default remains C → A → D → B → E unless go message picks otherwise.
4. Merge gate: **Jack confirm required before merge** (not Moe packaged confirm as a hard gate; Moe still welcome for packaged smoke).

---

## Jack test harness

Full pass/fail assertions, fixtures, CI gates, and would-have-caught map:

→ [`next-cycle-test-harness.md`](./next-cycle-test-harness.md)

Summary: every A–E defect has a unit (or integration) case that fails on today’s bug; smoke covers End blank, theme relaunch, Present close list cleanup, library default relaunch + re-point leave-old; Mac manual only for Item D fidelity. **Jack is the merge sign-off.** POC `mainSwitch` close tests are **not** sufficient for production Item C.

---

## References

- Jack harness: `/workspace/poster-plans/next-cycle-test-harness.md`
- Moe confirm: `/workspace/poster-regression-test/REGRESSION-CHECKLIST.md`
- Parked auto-update: `/workspace/poster-plans/auto-update-plan.md`
- Epic-004 context: directed send, theme persist, program thumbnail (repo `docs/epics`)
