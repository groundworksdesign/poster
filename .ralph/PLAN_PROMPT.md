# Plan Prompt (Poster)

Use **`.cursor/plans/remix_vite_+_deck_ux_7fba078c.plan.md`** as the roadmap (same path as `planFile` in `.ralph/config.json`).

When generating work artifacts:
- **Create/update `.ralph/specs/*`** with acceptance criteria, data model details (including deck defaults + per-slide style overrides), and architecture notes.
- **Create/update `.ralph/fix_plan_poster.md`** with a prioritized checklist. **Open tasks that control `ralph.sh` exit must live between** `<!-- ralph-open-tasks-start -->` and `<!-- ralph-open-tasks-end -->` (see that file).
- **Create/update `.ralph/session-plan.md`** with a “top N” slice of the current fix plan for the session.

Do not assume modules exist; search first. If missing, add spec modules under `.ralph/specs/`.

Study `.ralph/specs/*` and **`.ralph/fix_plan_poster.md`** for what remains.

At the beginning of planning mode also read:
- `.ralph/config.json` (especially `planFile`, `fixPlanFile`, task markers, `maxIterations`, `ignoreBlockedUncheckedTasks`)
- `.ralph/logs/progress.txt`
- `.ralph/logs/learnings.md`

**Source layout:** `src/` is the live CRA app today; `app/` is a Remix scaffold — the plan requires **one shared implementation** after migration.

CRITICAL: Only change files inside this repository root.

Build toward **Remix + Vite** per the active plan. Decks remain **JSON + in-browser state**; no server database unless requirements change.

ULTIMATE GOAL (aligned with active plan): Remix+Vite app with **new deck from scratch**, **full slide CRUD**, **deck-level style defaults** with **per-slide overrides** (`resolveSlideStyle`), **cast without slide-number messaging**, **title band at top/middle/bottom per slide**, song lyrics + green-screen, strong tests — specs and `fix_plan_poster.md` stay the living documentation.
