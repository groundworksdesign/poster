# Session plan — Poster (current slice)

**Sprint / loop baseline:** 2026-03-20 — fresh progress log; see `.ralph/logs/progress.txt` (`LOOP START` banner).

**Roadmap:** [.cursor/plans/remix_vite_+_deck_ux_7fba078c.plan.md](../.cursor/plans/remix_vite_+_deck_ux_7fba078c.plan.md)

**Execution checklist:** [.ralph/fix_plan_poster.md](./fix_plan_poster.md) (open items between Ralph markers)

Focused tasks (mirror the marked open list — implement in dependency order where it helps):

1. `style-merge-helper` — central style merge + tests; wire send + presenter
2. `deck-defaults-ui` — deck defaults panel + per-slide override UX
3. `slide-crud-editor` — new deck, CRUD, manual type editors
4. `presenter-ux` — no slide index on cast; vertical title overlay
5. `remix-vite-wireup` — CRA → Remix+Vite, scripts, Playwright server
6. `dedupe-app-src` — single module tree for routes

Notes:
- After substantive code changes, run tests and `npm run build` (until Remix replaces CRA scripts).
- Update `.ralph/specs/*` when acceptance criteria or the data model changes.
