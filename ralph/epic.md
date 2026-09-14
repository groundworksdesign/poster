---
name: QA and harden clean-architecture restructure
epic: epic-006-clean-architecture-harden
status: draft
overview: "The structural move to src rings + tests/e2e is already on this branch. Harden it: confirm layout and dependency rules, fix path/config/CI breakages from the move, make unit/integration/e2e that should pass actually pass, keep the Ralph loop harness under ralph/ (not .ralph/), and document residual AppImage risk for Jack."
todos:
  - id: fix-e2e-repo-root-paths
    content: Fix tests/e2e helpers and specs that still resolve repo root as tests/ (one level up) instead of the real repository root after the e2e/ → tests/e2e move.
    status: pending
  - id: audit-layer-import-rule
    content: Verify domain and application do not import Remix, Electron, or Playwright; fix any accidental coupling.
    status: pending
  - id: harden-config-ci-script-paths
    content: Sweep remaining stale app/, electron/, server/, shared/, e2e/ path references in configs, scripts, CI comments, and operator-facing README paths that would mislead packaging or local runs.
    status: pending
  - id: verify-unit-integration-green
    content: Run and fix unit + integration suites broken by the restructure so CI unit-integration stays green.
    status: pending
  - id: verify-remix-electron-e2e-green
    content: Run Remix and Electron Playwright suites after path fixes; repair any remaining move-induced failures that should pass.
    status: pending
  - id: document-appimage-residual-risk
    content: Document residual risk and a short manual AppImage regression checklist for Jack; do not claim packaged installers were fully re-proven in this loop unless evidence exists.
    status: pending
isProject: false
---

# QA and harden clean-architecture restructure

## Goal

Land a trustworthy clean-architecture tree on branch `cursor/clean-architecture-restructure-018c` (draft PR #21): rings under `src/`, Playwright under `tests/e2e`, correct configs/scripts/CI, green automated tests for move-induced breakages, and clear residual risk notes for Jack’s manual AppImage pass. Behavior stays unchanged — this epic is harden/QA, not features.

## Definition of Done

- Layout matches: `src/domain`, `src/application`, `src/adapters/{remix,electron,persistence,...}`, `src/presentation`, Playwright under `tests/e2e`
- No root `app/`; no `.ralph/` directory
- `ralph/` exists only as **this** Ralph loop harness (prompts, epic, task status, specs, AGENT) — not as old product epic leftovers
- Remix `appDirectory` (or equivalent) points at `src/adapters/remix`
- Domain and application do not import Remix / Electron / Playwright
- Configs, scripts, and CI paths are correct for the new layout
- Unit + integration + e2e that should pass do pass; fix breakages from the move
- Residual risk for Jack’s manual AppImage regression is documented

## Current Baseline (planning loop 1)

Confirmed on tip `9f124e1`:

- Rings present: `src/domain`, `src/application`, `src/adapters/{remix,electron,persistence,realtime}`, `src/presentation`
- No root `app/`; no `.ralph/`
- `remix.config.js` → `appDirectory: "src/adapters/remix"`
- `package.json` `main` / start scripts / Playwright scripts point at adapters + `tests/e2e`
- Portable + electron-builder pack lists rewritten for adapters/domain
- **Regressions from the move (highest risk, largely fixed in `cc2233f`):** `tests/e2e` helpers/specs that used one-level-up roots now use `../..` (`electronHelpers.ts`, `electron-theme-relaunch.spec.ts`, sample-deck paths, remix library relaunch/repoint server entry). Still selected for confirm + QA `passes`.
- Domain/application source (non-test) shows no Remix/Electron/Playwright imports in a quick scan; still needs an explicit audit task
- Historical epic docs under `docs/epics/` and some README strings still mention old `e2e/`, `electron/main.cjs`, `server/index.js` paths — operator docs risk, not always runtime
- `.gitignore` previously ignored `/ralph/`; this epic restores the loop harness and must keep `/.ralph/` ignored

## Implementation Plan (planning guidance; do not code in planning)

1. **fix-e2e-repo-root-paths** — Unblock Electron smoke and asset-based Remix specs by pointing `__dirname` roots at the real repo root (`../..` from `tests/e2e`).
2. **audit-layer-import-rule** — Grep/enforce dependency direction; fix any leaks.
3. **harden-config-ci-script-paths** — Finish stale path sweep in scripts/README/CI comments that affect operators or packaging.
4. **verify-unit-integration-green** — `tsc` + Jest unit/integration.
5. **verify-remix-electron-e2e-green** — Playwright Remix + Electron after path fixes.
6. **document-appimage-residual-risk** — Short residual-risk note + Jack checklist; draft PR stays draft.

### Functional requirements

- **REQ-001** E2E path roots: Every `tests/e2e` helper/spec that needs the repository root or `public/` resolves them correctly after the move (not `tests/` as root).
- **REQ-002** Layer rule: `src/domain` and `src/application` do not import Remix, Electron, or Playwright.
- **REQ-003** Config/CI/scripts: Runtime and packaging path references match the new layout; no broken `appDirectory` / `main` / pack entries.
- **REQ-004** Automated suites: Unit, integration, and e2e that should pass do pass after move fixes.
- **REQ-005** Residual risk: Jack’s AppImage / packaged regression checklist and known residual risks are written down; this loop does not merge PR #21.

## Validation

- [ ] REQ-001 `electronHelpers` / Electron theme relaunch launch the app from the repo root; sample-deck paths resolve to `public/`.
- [ ] REQ-002 No Remix/Electron/Playwright imports under `src/domain` or `src/application` (tests may still mock/adapters separately as appropriate).
- [ ] REQ-003 `remix.config.js` appDirectory, package.json main/scripts, electron-builder + portable scripts align with adapters.
- [ ] REQ-004 `tsc --noEmit`, Jest unit/integration, `pnpm run test:e2e:remix`, and `pnpm run test:e2e:electron` pass (or failures are documented as pre-existing and out of scope with evidence).
- [ ] REQ-005 Residual AppImage risk doc exists; draft PR #21 remains draft/unmerged.
- [ ] No `.ralph/`; `ralph/` is only the loop harness for this pass.

## Out of scope

- New product features
- Opening a second PR or marking #21 ready / merging
- Recreating `.ralph/`
- Claiming full packaged AppImage proof without running those installers

## Risks to manage

- Electron e2e launching against `tests/` silently fails or packs the wrong tree
- Packaged AppImage still needs Jack’s manual regression even when CI unit/e2e are green
- Over-editing historical `docs/epics/*` vs fixing operator-facing README/scripts — prefer runtime/operator paths first
