# Poster — Ralph / agent notes

## What this repo is
- Two-window **Poster** app: **`/deck`** (composer) and **`/presentation`** (cast), synced via **`BroadcastChannel('presentation')`**.
- **Active engineering plan:** `.cursor/plans/remix_vite_+_deck_ux_7fba078c.plan.md` (also `planFile` in `.ralph/config.json`).
- **Ralph task list:** `.ralph/fix_plan_poster.md` — open work is only the checklist **between** `<!-- ralph-open-tasks-start -->` and `<!-- ralph-open-tasks-end -->`. When all those lines are checked off, `./.ralph/ralph.sh` exits.

## Specs (update as behavior changes)
- `.ralph/specs/app_spec.md` — flows and requirements
- `.ralph/specs/features.md` / `.ralph/specs/features/features.md` — feature list
- `.ralph/specs/data_model.md` / `.ralph/specs/data_model/data_model.md` — types, defaults/overrides
- `.ralph/specs/architecture.md` / `.ralph/specs/architecture/architecture.md` — modules and tests

## Build / test (current)
- **Dev (CRA):** `npm start` — webpack via `react-scripts`.
- **Tests:** `npm test` (Jest + RTL); `npm run test:coverage` / `npm run coverage` for coverage.
- **Production build (CRA):** `npm run build` → `build/`.
- **Remix (in progress):** `npm run dev:remix` / `npm run build:remix` / `npm run start:remix` — see plan for full Vite+Remix target state.
- **E2E:** Playwright `playwright.config.ts` (currently starts `npm run start`).

## Vendor / offline Remix
- See `.ralph/AGENT_VENDOR.md` and `server/index.js`.

## Loop start state (reset before a new Ralph sprint)
Use this checklist so `./.ralph/ralph.sh` and the agent see a consistent baseline:

| File | Expected state |
|------|----------------|
| `.ralph/config.json` | `maxIterations` > 0 (e.g. **20**). `planFile` points at the active Cursor plan. |
| `.ralph/fix_plan_poster.md` | Open work only as `- [ ]` lines **between** `<!-- ralph-open-tasks-start -->` and `<!-- ralph-open-tasks-end -->`. |
| `.ralph/logs/progress.txt` | Contains a **`LOOP START`** banner (timestamp + plan + next task). **Append** per iteration; do not delete history mid-sprint unless intentionally archiving. |
| `.ralph/session-plan.md` | Matches current sprint slice / first open task. |
| `.ralph/logs/learnings.md` | Optional: keep prior learnings; only append new sections. |

If `maxIterations` is **0**, the shell loop runs **zero** Copilot iterations and exits immediately with open tasks still pending.
