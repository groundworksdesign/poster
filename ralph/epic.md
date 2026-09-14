---
name: QA and harden clean-architecture restructure
epic: epic-006-clean-architecture-harden
status: in_progress
overview: "The structural move to src rings + tests/e2e is already on this branch. Harden it: confirm layout and dependency rules, fix path/config/CI breakages from the move, make unit/integration/e2e that should pass actually pass, restore packaged Electron Present first-open hydrate reliability (Jack AppImage NOT READY), unblock On Program once Present is live, keep the Ralph loop harness under ralph/ (not .ralph/), and document residual AppImage risk for Jack."
todos:
  - id: fix-e2e-repo-root-paths
    content: Fix tests/e2e helpers and specs that still resolve repo root as tests/ (one level up) instead of the real repository root after the e2e/ → tests/e2e move.
    status: done
  - id: audit-layer-import-rule
    content: Verify domain and application do not import Remix, Electron, or Playwright; fix any accidental coupling.
    status: done
  - id: harden-config-ci-script-paths
    content: Sweep remaining stale app/, electron/, server/, shared/, e2e/ path references in configs, scripts, CI comments, and operator-facing README paths that would mislead packaging or local runs.
    status: pending
  - id: verify-unit-integration-green
    content: Run and fix unit + integration suites broken by the restructure so CI unit-integration stays green.
    status: pending
  - id: verify-remix-electron-e2e-green
    content: Run Remix and Electron Playwright suites after path fixes; repair any remaining move-induced failures that should pass. Confirm CI red helpers-under-tests/ on tip 9f124e1 is resolved on current tip after e2e root work.
    status: pending
  - id: fix-present-first-open-hydrate
    content: Restore reliable Present first-open hydrate on packaged Electron/AppImage after the clean-arch move (Jack cold open 1/3 PASS, 2/3 stuck SSR Loading; possible regression of PR #18 first-open fix under new layout).
    status: done
  - id: verify-on-program-after-present-hydrate
    content: After Present first-open hydrate is reliable on packaged Electron, verify On Program thumbnail/state works end-to-end (blocked while Present stays on Loading).
    status: done
  - id: document-appimage-residual-risk
    content: Document residual risk and a short manual AppImage regression checklist for Jack, including the 9f124e1 baseline (Present hydrate flaky, On Program blocked, Home/library/theme/layout PASS); do not claim packaged installers were fully re-proven in this loop unless evidence exists.
    status: pending
isProject: false
---

# QA and harden clean-architecture restructure

## Goal

Land a trustworthy clean-architecture tree on branch `cursor/clean-architecture-restructure-018c` (draft PR #21): rings under `src/`, Playwright under `tests/e2e`, correct configs/scripts/CI, green automated tests for move-induced breakages, reliable packaged Present first-open hydrate, On Program once Present is live, and clear residual risk notes for Jack’s manual AppImage pass. Behavior stays unchanged except where the restructure regressed packaged first-open hydrate — this epic is harden/QA, not features.

## Definition of Done

- Layout matches: `src/domain`, `src/application`, `src/adapters/{remix,electron,persistence,...}`, `src/presentation`, Playwright under `tests/e2e`
- No root `app/`; no `.ralph/` directory
- `ralph/` exists only as **this** Ralph loop harness (prompts, epic, task status, specs, AGENT) — not as old product epic leftovers
- Remix `appDirectory` (or equivalent) points at `src/adapters/remix`
- Domain and application do not import Remix / Electron / Playwright
- Configs, scripts, and CI paths are correct for the new layout
- Unit + integration + e2e that should pass do pass; fix breakages from the move
- Packaged Electron/AppImage Present cold first-open reaches `present-ready` reliably (not stuck on SSR `Loading...`)
- On Program works once Present hydrates on packaged Electron
- Residual risk for Jack’s manual AppImage regression is documented (including known baseline)

## Jack AppImage baseline (tip `9f124e1`) — NOT READY

Recorded for planning; do not treat as a green AppImage sign-off:

| Area | Result |
| --- | --- |
| Cold Present first-open hydrate | **Flaky** — 1/3 PASS, 2/3 stuck SSR `Loading...` on packaged AppImage (suspect regression of PR #18 first-open fix under new layout) |
| On Program | **Blocked** by Present not hydrating |
| Home / library save-quit-reopen / theme | PASS |
| Clean-arch layout | PASS |
| CI on that tip | Unit green; Remix E2E + Electron smoke **red** due to helpers path under `tests/` — addressed by `fix-e2e-repo-root-paths` (passes true); re-verify on current tip in `verify-remix-electron-e2e-green` |

## Current Baseline (planning loop 5)

Confirmed on tip `c361bae` / planning sync (this commit):

- Rings present; no root `app/`; no `.ralph/`
- `fix-e2e-repo-root-paths`, `fix-present-first-open-hydrate`, `verify-on-program-after-present-hydrate` **done / passes true**
- `audit-layer-import-rule` **done / passes true** (Jest guard `src/__tests__/layer-import-rule.test.js`; independent audit clean)
- README still mentions stale `electron/main.cjs` / `server/index.js` operator paths — `harden-config-ci-script-paths` next after audit
- Suite greens + AppImage residual doc remain

## Implementation Plan (planning guidance; do not code in planning)

1. **fix-e2e-repo-root-paths** — DONE (QA passed).
2. **fix-present-first-open-hydrate** — DONE (QA passed; Jack AppImage retest remains).
3. **verify-on-program-after-present-hydrate** — DONE (Electron e2e QA-passed; AppImage retest remains).
4. **audit-layer-import-rule** — DONE (QA passed).
5. **harden-config-ci-script-paths** — Finish stale path sweep in scripts/README/CI comments.
6. **verify-unit-integration-green** — `tsc` + Jest unit/integration.
7. **verify-remix-electron-e2e-green** — Playwright Remix + Electron on current tip (confirm helpers-path CI red is gone).
8. **document-appimage-residual-risk** — Residual-risk note + Jack checklist including 9f124e1 baseline; draft PR stays draft.

### Functional requirements

- **REQ-001** E2E path roots: Every `tests/e2e` helper/spec that needs the repository root or `public/` resolves them correctly after the move (not `tests/` as root).
- **REQ-002** Layer rule: `src/domain` and `src/application` do not import Remix, Electron, or Playwright.
- **REQ-003** Config/CI/scripts: Runtime and packaging path references match the new layout; no broken `appDirectory` / `main` / pack entries.
- **REQ-004** Automated suites: Unit, integration, and e2e that should pass do pass after move fixes.
- **REQ-005** Residual risk: Jack’s AppImage / packaged regression checklist and known residual risks are written down; this loop does not merge PR #21.
- **REQ-006** Present first-open hydrate (packaged): Cold Open Present on packaged Electron/AppImage reliably leaves SSR `Loading...` and reaches client `present-ready` (restore PR #18 first-open behavior if regressed by layout move).
- **REQ-007** On Program after Present live: Deck On Program thumbnail/state works on packaged Electron once Present hydrates.

## Validation

- [x] REQ-001 `electronHelpers` / Electron theme relaunch launch the app from the repo root; sample-deck paths resolve to `public/` (QA passed).
- [x] REQ-002 No Remix/Electron/Playwright imports under `src/domain` or `src/application` (QA passed; Jest guard).
- [ ] REQ-003 `remix.config.js` appDirectory, package.json main/scripts, electron-builder + portable scripts align with adapters.
- [ ] REQ-004 `tsc --noEmit`, Jest unit/integration, `pnpm run test:e2e:remix`, and `pnpm run test:e2e:electron` pass on current tip (or failures documented as pre-existing with evidence).
- [ ] REQ-005 Residual AppImage risk doc exists (include Jack 9f124e1 baseline); draft PR #21 remains draft/unmerged.
- [x] REQ-006 Packaged Present first-open hydrate engineering fix landed + QA-passed (main-owned present-session); Jack AppImage retest still for final packaged sign-off.
- [x] REQ-007 On Program verified after Present hydrate is reliable (Electron e2e QA-passed; AppImage installer retest still Jack/REQ-005).
- [ ] No `.ralph/`; `ralph/` is only the loop harness for this pass.

## Out of scope

- New product features unrelated to restructure harden / AppImage regressions
- Opening a second PR or marking #21 ready / merging
- Recreating `.ralph/`
- Claiming full packaged AppImage proof without Jack’s retest after Present hydrate is fixed

## Risks to manage

- Packaged Present stuck on SSR Loading (Jack 2/3) blocks On Program and AppImage sign-off
- Electron e2e launching against `tests/` (mitigated; re-verify CI on current tip)
- Over-editing historical `docs/epics/*` vs fixing operator-facing README/scripts — prefer runtime/operator paths first
