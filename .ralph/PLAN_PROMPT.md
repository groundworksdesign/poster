# Plan Prompt (Poster)

Use `.cursor/plans/poster-remix-tests_d601662c.plan.md` as the roadmap.

When generating work artifacts:
- Create/update `.ralph/specs/*` with acceptance criteria and data model details.
- Create/update `.ralph/fix_plan.md` (and keep `.ralph/fix_plan_poster.md` in sync if the loop still reads it) with a prioritized list of items not yet implemented.
- Create/update `.ralph/session-plan.md` with a “top 10” slice of the active fix plan.

Do not assume modules exist; search first. If missing, author the new spec module under `.ralph/specs/`.

Study `.ralph/specs/*` for application specifications and `.ralph/fix_plan.md` to see what is left to do.

At the beginning of planning mode also read:
- `.ralph/config.json` to understand loop configuration and constraints.
- `.ralph/logs/progress.txt` to see what has already been attempted or completed.
- `.ralph/logs/learnings.md` to incorporate durable learnings into future plans.

The source code lives in `src/` today (Create React App). The roadmap migrates the shell to **Remix + Vite**; there is **no Prisma, no SQLite, and no server database** for Poster—decks are JSON files + in-browser state, and the two windows talk over `BroadcastChannel`.

CRITICAL: You must ONLY make changes within this **poster** repository (the project root). Do not modify files outside of this project.

First task is to study `.ralph/fix_plan.md` (it may be incorrect) and, using subagents as needed, compare existing code under `src/` against the specifications. Create/update `.ralph/fix_plan.md` as a bullet list sorted by priority for work not yet implemented. Search for TODOs, placeholders, and minimal stubs. Keep the fix plan accurate as items become complete or as new tasks are split out.

IMPORTANT: Build toward **Remix + Vite** per `.cursor/plans/poster-remix-tests_d601662c.plan.md`. Do not introduce Prisma or a SQL database unless the product requirements explicitly change.

ULTIMATE GOAL: a **two-window Poster app**—composer (`/deck`) and cast (`/presentation`)—with song XML loading, lyrics (two lines at a time), editable/reorderable slides, deck save/load (JSON), green-screen friendly casting, and strong unit/integration tests (Vitest + RTL + minimal Playwright). If specs are missing, add them at `.ralph/specs/MODULE_NAME/MODULE_NAME.md` (search before creating). If you add a spec module, reflect the implementation work in `.ralph/fix_plan.md`.
