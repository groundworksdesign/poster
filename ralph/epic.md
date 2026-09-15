---
name: QA and harden clean-architecture restructure
epic: epic-006-clean-architecture-harden
status: complete
overview: "The structural move to src rings + tests/e2e is already on this branch. Harden it: confirm layout and dependency rules, fix path/config/CI breakages from the move, make unit/integration/e2e that should pass actually pass, restore packaged Electron Present first-open hydrate reliability (Jack AppImage NOT READY), unblock On Program once Present is live, keep the Ralph loop harness under ralph/ (not .ralph/), and document residual AppImage risk for Jack. Reopened after tip 497d454 (Library Open→Present); tip 7c947cd (blank-deck after import); again after tip c3a1642: Present still flaky Loading with preload + real presentId URL (not about:blank). REQ-010 engineering QA-passed @ db1c30e; completeEpic true; Jack AppImage cold repeats still residual. Draft PR #21 stays draft."
todos:
  - id: fix-e2e-repo-root-paths
    content: Fix tests/e2e helpers and specs that still resolve repo root as tests/ (one level up) instead of the real repository root after the e2e/ → tests/e2e move.
    status: done
  - id: audit-layer-import-rule
    content: Verify domain and application do not import Remix, Electron, or Playwright; fix any accidental coupling.
    status: done
  - id: harden-config-ci-script-paths
    content: Sweep remaining stale app/, electron/, server/, shared/, e2e/ path references in configs, scripts, CI comments, and operator-facing README paths that would mislead packaging or local runs.
    status: done
  - id: verify-unit-integration-green
    content: Run and fix unit + integration suites broken by the restructure so CI unit-integration stays green.
    status: done
  - id: verify-remix-electron-e2e-green
    content: Run Remix and Electron Playwright suites after path fixes; repair any remaining move-induced failures that should pass. Confirm CI red helpers-under-tests/ on tip 9f124e1 is resolved on current tip after e2e root work.
    status: done
  - id: fix-present-first-open-hydrate
    content: Restore reliable Present first-open hydrate on packaged Electron/AppImage after the clean-arch move (Jack cold open 1/3 PASS, 2/3 stuck SSR Loading; possible regression of PR #18 first-open fix under new layout).
    status: done
  - id: verify-on-program-after-present-hydrate
    content: After Present first-open hydrate is reliable on packaged Electron, verify On Program thumbnail/state works end-to-end (blocked while Present stays on Loading).
    status: done
  - id: document-appimage-residual-risk
    content: Document residual risk and a short manual AppImage regression checklist for Jack, including the 9f124e1 baseline (Present hydrate flaky, On Program blocked, Home/library/theme/layout PASS); do not claim packaged installers were fully re-proven in this loop unless evidence exists.
    status: done
  - id: fix-library-open-present-hydrate
    content: Fix packaged Electron/AppImage Present first-open hydrate after Library Open into Deck (Jack tip 497d454 FAIL — SSR Loading ≥30s). Distinct from blank-deck Open Present (REQ-006 PASS on same tip).
    status: done
  - id: fix-appimage-blank-deck-present-send-after-import
    content: Fix packaged AppImage blank-deck cold Open Present + directed send after file import (Jack tip 7c947cd FAIL flaky ~1/3–1/2). Tip Electron PASS; CI installers green; Library Open→Present 3/3 PASS.
    status: done
  - id: fix-appimage-present-hydrate-real-url-preload
    content: Fix packaged AppImage Present client hydrate when URL is already a real presentId present-session URL and preload is present (SSR Loading hang/race). Jack tip c3a1642 blank-deck+import cold Present flaky 7/12 (~58%) — NOT about:blank. Distinct from REQ-009.
    status: done
isProject: false
---

# QA and harden clean-architecture restructure

## Goal

Land a trustworthy clean-architecture tree on branch `cursor/clean-architecture-restructure-018c` (draft PR #21): rings under `src/`, Playwright under `tests/e2e`, correct configs/scripts/CI, green automated tests for move-induced breakages, reliable packaged Present first-open hydrate (blank-deck **and** Library Open → Present), reliable AppImage Present **client hydrate when presentId URL + preload are already correct** (not only about:blank avoidance), On Program once Present is live, and clear residual risk notes for Jack’s manual AppImage pass. Behavior stays unchanged except where the restructure regressed packaged first-open hydrate — this epic is harden/QA, not features.

## Definition of Done

- Layout matches: `src/domain`, `src/application`, `src/adapters/{remix,electron,persistence,...}`, `src/presentation`, Playwright under `tests/e2e`
- No root `app/`; no `.ralph/` directory
- `ralph/` exists only as **this** Ralph loop harness (prompts, epic, task status, specs, AGENT) — not as old product epic leftovers
- Remix `appDirectory` (or equivalent) points at `src/adapters/remix`
- Domain and application do not import Remix / Electron / Playwright
- Configs, scripts, and CI paths are correct for the new layout
- Unit + integration + e2e that should pass do pass; fix breakages from the move
- Packaged Electron/AppImage Present cold first-open reaches `present-ready` reliably (not stuck on SSR `Loading...`) — including **Library Open → Present**
- On Program works once Present hydrates on packaged Electron
- Residual risk for Jack’s manual AppImage regression is documented (including known baselines)

## Jack AppImage baseline (tip `9f124e1`) — NOT READY

Recorded for planning; do not treat as a green AppImage sign-off:

| Area | Result |
| --- | --- |
| Cold Present first-open hydrate | **Flaky** — 1/3 PASS, 2/3 stuck SSR `Loading...` on packaged AppImage (suspect regression of PR #18 first-open fix under new layout) |
| On Program | **Blocked** by Present not hydrating |
| Home / library save-quit-reopen / theme | PASS |
| Clean-arch layout | PASS |
| CI on that tip | Unit green; Remix E2E + Electron smoke **red** due to helpers path under `tests/` — addressed by `fix-e2e-repo-root-paths` (passes true); re-verify on current tip in `verify-remix-electron-e2e-green` |

## Jack AppImage baseline (tip `497d454`) — NOT READY

Packaged/Electron tip after REQ-006 main-owned present-session + residual doc:

| Area | Result |
| --- | --- |
| Blank-deck cold Open Present + send | **3/3 PASS** |
| **Library Open → Present** | **FAIL** — SSR `Loading...` ≥30s (does not hydrate) |
| Message-only | PASS |
| On Program | PASS |
| Theme | PASS |
| Library root | PASS |
| Home | PASS |

**Operator doc (REQ-005):** residual risk + Jack manual checklist → [`docs/appimage-residual-risk.md`](../docs/appimage-residual-risk.md) (draft PR #21 stays draft until Jack records AppImage READY).

## Jack AppImage baseline (tip `7c947cd`) — NOT READY (superseded by `c3a1642`)

Packaged AppImage re-check after REQ-008:

| Area | Result |
| --- | --- |
| **Library Open → Present** | **3/3 PASS** (REQ-008) |
| **Blank-deck cold Present + send after file import** | **FAIL (flaky)** — ~1/3–1/2 fail on AppImage |
| Tip unpackaged Electron | PASS |
| CI installers | green |

## Jack AppImage baseline (tip `c3a1642`) — NOT READY (current packaged blocker)

After REQ-009 QA (about:blank / late-poster / Start gate), Jack retested tip `c3a1642`:

| Area | Result |
| --- | --- |
| **Blank-deck + import cold Present (AppImage)** | **FAIL (flaky) 7/12 (~58%)** — SSR Loading with **preload + real presentId URL** (not about:blank) |
| Library Open → Present | Primary **3/3 PASS**; later **1/2 flake** |
| Tip unpackaged Electron (blank + library) | PASS |

**Implication:** REQ-009 about:blank/named-window harden was incomplete. Next work is client hydrate / present-ready handshake when session URL + preload are already correct (REQ-010).

## Current Baseline (QA loop after REQ-010)

Confirmed on tip `db1c30e` (engineering QA):

- Rings present; no root `app/`; no `.ralph/`
- All harden/QA todos through `fix-appimage-present-hydrate-real-url-preload` **done / passes true** (REQ-001..010 engineering)
- Epic **completeEpic true** — Jack AppImage cold Present repeats still residual for packaged sign-off
- Draft PR #21 remains draft/unmerged

## Implementation Plan (planning guidance; do not code in planning)

1. **fix-e2e-repo-root-paths** — DONE (QA passed).
2. **fix-present-first-open-hydrate** — DONE (QA passed; blank-deck AppImage path PASS on tip 497d454).
3. **verify-on-program-after-present-hydrate** — DONE (Electron e2e QA-passed; AppImage On Program PASS on tip 497d454).
4. **audit-layer-import-rule** — DONE (QA passed).
5. **harden-config-ci-script-paths** — DONE (QA passed).
6. **verify-unit-integration-green** — DONE (QA passed).
7. **verify-remix-electron-e2e-green** — DONE (QA passed).
8. **document-appimage-residual-risk** — DONE (QA passed).
9. **fix-library-open-present-hydrate** — **DONE** (REQ-008 QA-passed @ a4a1a18; Jack AppImage Library Open→Present 3/3 PASS @ 7c947cd).
10. **fix-appimage-blank-deck-present-send-after-import** — **DONE** (REQ-009 QA-passed @ 083bfcb; Jack tip `c3a1642` showed remaining hydrate race → REQ-010).
11. **fix-appimage-present-hydrate-real-url-preload** — **DONE** (REQ-010 QA-passed @ `db1c30e`; Jack AppImage cold repeats still residual).


### Functional requirements

- **REQ-001** E2E path roots: Every `tests/e2e` helper/spec that needs the repository root or `public/` resolves them correctly after the move (not `tests/` as root).
- **REQ-002** Layer rule: `src/domain` and `src/application` do not import Remix, Electron, or Playwright.
- **REQ-003** Config/CI/scripts: Runtime and packaging path references match the new layout; no broken `appDirectory` / `main` / pack entries.
- **REQ-004** Automated suites: Unit, integration, and e2e that should pass do pass after move fixes.
- **REQ-005** Residual risk: Jack’s AppImage / packaged regression checklist and known residual risks are written down; this loop does not merge PR #21.
- **REQ-006** Present first-open hydrate (packaged): Cold blank-deck Open Present on packaged Electron/AppImage reliably leaves SSR `Loading...` and reaches client `present-ready` (restore PR #18 first-open behavior if regressed by layout move).
- **REQ-007** On Program after Present live: Deck On Program thumbnail/state works on packaged Electron once Present hydrates.
- **REQ-008** Library Open → Present first-open hydrate (packaged): After Library Open into Deck, first Open Present reaches `present-ready` (not stuck SSR Loading ≥30s). Distinct from blank-deck path in REQ-006.
- **REQ-009** AppImage blank-deck Present+send after file import: Avoid about:blank / named-window fallthrough after import (Import `_blank`, Electron-UA poster wait, Start gate). Engineering QA-passed @ 083bfcb; Jack tip `c3a1642` showed remaining hydrate race → REQ-010.
- **REQ-010** AppImage Present client hydrate with real presentId URL + preload: Cold Open Present must leave SSR Loading and reach `present-ready` when main-owned present-session URL already has `presentId` and preload is present (Jack tip `c3a1642` flaky 7/12). Distinct from about:blank fallthrough.

## Validation

- [x] REQ-001 `electronHelpers` / Electron theme relaunch launch the app from the repo root; sample-deck paths resolve to `public/` (QA passed).
- [x] REQ-002 No Remix/Electron/Playwright imports under `src/domain` or `src/application` (QA passed; Jest guard).
- [x] REQ-003 `remix.config.js` appDirectory, package.json main/scripts, electron-builder + portable scripts align with adapters.
- [x] REQ-004 `tsc --noEmit`, Jest unit/integration, `pnpm run test:e2e:remix`, and `pnpm run test:e2e:electron` pass on current tip (or failures documented as pre-existing with evidence).
- [x] REQ-005 Residual AppImage risk doc exists (include Jack 9f124e1 baseline); draft PR #21 remains draft/unmerged.
- [x] REQ-006 Packaged Present first-open hydrate engineering fix landed + QA-passed (main-owned present-session); Jack tip 497d454 blank-deck Open Present+send 3/3 PASS.
- [x] REQ-007 On Program verified after Present hydrate is reliable (Electron e2e QA-passed; Jack tip 497d454 On Program PASS).
- [x] REQ-008 Library Open → Present reaches `present-ready` (engineering + Electron e2e QA-passed @ a4a1a18; Jack tip 7c947cd AppImage 3/3 PASS).
- [x] REQ-009 about:blank / late-poster / Start-gate harden landed + engineering QA-passed @ 083bfcb (Jack tip `c3a1642` residual → REQ-010).
- [x] REQ-010 AppImage Present client hydrate engineering harden landed + QA-passed @ `db1c30e` (watchdog reload-once; tip Electron stress/import/library green). Jack AppImage cold repeats still residual for packaged sign-off.
- [x] No `.ralph/`; `ralph/` is only the loop harness for this pass.

## Out of scope

- New product features unrelated to restructure harden / AppImage regressions
- Opening a second PR or marking #21 ready / merging
- Recreating `.ralph/`
- Claiming full packaged AppImage proof without Jack’s retest after Present hydrate-with-real-URL is reliable on AppImage

## Risks to manage

- AppImage Present stuck Loading despite real presentId URL + preload (Jack tip `c3a1642` 7/12) blocks AppImage READY
- AppImage/FUSE loadURL / Remix SSR / present-ready handshake may not reproduce on tip Electron / CI
- Library Open → Present later flake (tip `c3a1642` 1/2) may share the same hydrate race
- AppImage blank-deck Present+send after file import flaky (Jack tip 7c947cd) blocks AppImage READY even when Library Open→Present PASSes
- AppImage/FUSE or post-import timing/session race may not reproduce on tip Electron / CI
- Library Open → Present stuck on SSR Loading (Jack tip 497d454) blocks AppImage READY even when blank-deck Open Present PASSes
- Library Deck `noopener` / named window / assign fallback may drop preload/`window.poster` and force `about:blank` Present path
- Electron e2e launching against `tests/` (mitigated; re-verify CI on current tip)
- Over-editing historical `docs/epics/*` vs fixing operator-facing README/scripts — prefer runtime/operator paths first
