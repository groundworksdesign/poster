You are running the Ralph loop for the `poster` repository.

Read these inputs before creating/updating artifacts:
- **`.cursor/plans/remix_vite_+_deck_ux_7fba078c.plan.md`** (active roadmap + acceptance notes; path is also in `.ralph/config.json` as `planFile`)
- `.ralph/config.json` (loop constraints: `maxIterations`, `planFile`, `fixPlanFile`, `openTasksStartMarker` / `openTasksEndMarker`, `ignoreBlockedUncheckedTasks`, log paths)
- `.ralph/logs/progress.txt` (what was attempted/completed)
- `.ralph/logs/learnings.md` (durable learnings)
- **`.ralph/specs/*`** (specs; **create or update** when the plan introduces new behavior, data rules, or acceptance criteria)
- **`.ralph/fix_plan_poster.md`** (prioritized execution checklist; **keep aligned with the plan** — add/split tasks as needed, mark `[x]` when done)

CRITICAL: Only modify files within this repository.

What to do every iteration:
1. **Specs:** Ensure `.ralph/specs/*` reflects the active plan (Remix+Vite migration, deck defaults + per-slide overrides, full slide CRUD, cast UX, broadcast pipeline, testing). Update `data_model`, `features`, `architecture`, and `app_spec` when behavior changes.
2. **Fix plan:** Keep **`.ralph/fix_plan_poster.md`** aligned with the roadmap. Open work lives **between** `<!-- ralph-open-tasks-start -->` and `<!-- ralph-open-tasks-end -->`; `ralph.sh` exits when that section has no unchecked `- [ ]` items (except lines tagged **blocked**, per config).
3. Pick the **next** open item in the marked section of `.ralph/fix_plan_poster.md`.
4. Before code changes, search the codebase to confirm what is already implemented (do not assume placeholders).
5. Implement missing functionality or fix regressions for that item.
6. Run tests/build for the changed unit (and a broader test/build when appropriate). This repo currently uses **Jest** via `react-scripts` (`npm test`, `npm run build`).
7. Append a concise entry to `.ralph/logs/progress.txt`.
8. When you learn something generally useful, append to `.ralph/logs/learnings.md`.

Output expectations:
- Specs and acceptance criteria live in **`.ralph/specs/*`**.
- The Cursor plan file may be updated manually if the roadmap shifts; prefer keeping `.ralph/fix_plan_poster.md` and specs in sync with code reality.

Loop driver behavior (read `.ralph/config.json`):
- `ralph.sh` pipes **`planFile` + this PROMPT + fixPlanFile** into `copilot`.
- Exit when the **marked** open-task section in `fixPlanFile` has zero unchecked items (subject to `ignoreBlockedUncheckedTasks`).

Source layout:
- **Today:** primary app code is under `src/` (CRA). **`app/`** holds a partial Remix scaffold — migration should converge to one implementation (see plan `dedupe-app-src`).

0a. Study `.ralph/specs/*` for application specifications.

0b. Read `.ralph/config.json` for loop settings.

0c. Read `.ralph/logs/progress.txt` at the beginning of each loop. If the latest block is **`LOOP START`** (no entries below the separator yet), treat this as **iteration 0** for the current plan: implement the **first** unchecked task in the marked section of `fix_plan_poster.md` (today: `style-merge-helper`).

0d. Read `.ralph/logs/learnings.md` at the beginning of each loop.

0e. Treat **`.ralph/fix_plan_poster.md`** as the execution checklist; pick the next task from the **marked** section and mark items completed when done.

1. Implement missing functionality per specs and the active plan. Search the codebase before assuming gaps.

2. After changes, run tests or `npm run build` for the affected area.

2a. Append to `.ralph/logs/progress.txt`: tasks attempted, tasks completed (including checkmarks in `.ralph/fix_plan_poster.md`), test/build results.

2b. Append durable notes to `.ralph/logs/learnings.md` when useful.

3. When you find bugs or scope gaps, update `.ralph/fix_plan_poster.md` (inside or outside the marked section as appropriate). Resolve or document **blocked** work with the word `blocked` on the same line so it can be ignored for exit if configured.

4. **Git:** When tests/build pass, commit with a clear message; push if remote is configured (per your workflow).

999. Capture why tests matter next to non-trivial implementations.

9999. Prefer a **single source of truth** for deck/present logic; fix unrelated test failures you introduce.

99999999999. Keep **`.ralph/AGENT.md`** brief and current with build/run commands (not status reports).

**Note:** Older prompts referenced `.ralph/fix_plan.md` — the canonical file for this repo is **`.ralph/fix_plan_poster.md`**.

/fleet
