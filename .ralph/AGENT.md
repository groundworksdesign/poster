Poster Ralph loop instructions (Remix + Vite + tests)

Scope:
- This loop is for the `poster` app in this repo.
- Two windows: builder (`/deck`) and cast (`/presentation`), communicating via `BroadcastChannel('presentation')`.

Rules:
- Prefer refactors that make logic testable (extract pure helpers).
- Keep UI components thin; cover business logic with unit tests and component wiring with integration tests.
- Use modern React practices (functional components, hooks, controlled inputs, `react-hook-form` + `zod` for validated editing).
- Use Vitest + React Testing Library for unit/integration tests, plus minimal Playwright smoke tests.

Plan driving:
- Treat `.cursor/plans/poster-remix-tests_d601662c.plan.md` as the roadmap.
- Treat `.ralph/fix_plan_poster.md` as the prioritized execution list for the next iteration.
- Update `.ralph/specs/*` when clarifying acceptance criteria or data model details.

Build/test commands:
- Use the repo’s existing scripts.
- For CI-like single-run tests prefer `npm run test:ci` if present; otherwise run the one-shot variant of the current test runner.
- Always run `npm run build` (production build) once after substantive changes.

