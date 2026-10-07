# Ralph loop agent guide

## Install

```bash
pnpm install
pnpm rebuild better-sqlite3   # optional; native SQLite on supported Node
```

## Dev server (full app: Remix + library APIs)

```bash
pnpm dev
```

Open http://localhost:3000 (or the URL the CLI prints).

## Build

```bash
pnpm run build:remix
pnpm start
```

## Unit tests (Jest + RTL)

```bash
CI=true pnpm test -- --watchAll=false
```

Coverage:

```bash
pnpm run test:coverage
```

## E2E (Playwright)

Remix (preferred for library and home flows):

```bash
pnpm run test:e2e:remix
```

CRA-only config (legacy):

```bash
pnpm run test:e2e
```

Electron smoke:

```bash
pnpm run test:e2e:electron
```

Install browsers once if needed:

```bash
npx playwright install --with-deps
```

## Electron (local desktop shell)

```bash
pnpm run electron
```

## Lint

No dedicated `pnpm run lint` script. ESLint is configured via `react-scripts` (`eslintConfig` in `package.json`). Run unit tests and relevant E2E after changes.

## Loop rules

- Work on the branch recorded in `ralph/task_status.json` (`cursor/epic-004-song-library`).
- Canonical status file is `ralph/task_status.json` (do not revive `ralph/task-status.json`).
- Read `ralph/epic.md`, `ralph/task_status.json`, and binding specs under `ralph/specs/` before each loop.
- Planning loop: search the codebase before assuming something is unimplemented; set `selected` to the single most important remaining task; no product code.
- Dev loop: implement only the selected task. Dev never sets `passes: true`.
- QA loop: verify against acceptance criteria; only QA sets `passes: true`; do not change product code in QA.
- One task per loop. Max 24 loops for this epic.
- After a task passes QA, commit that task on the working branch; intermediate commits use `[skip ci]`.
- **Do not open a PR until every task passes and `completeEpic` is true.** If the platform auto-opens a PR, close it. Release persona opens one PR to `main`; Iris gates, Roy decides. Do not merge. PR title/body must not contain `[skip ci]`.
- Do not overwrite `ralph/PROMPT_*.md` files once created; add missing prompts only.
- Do not create a parallel `.ralph/` tree. `ralph/` is the loop harness for this epic.
- Keep run logs/transcripts out of commits.

## Epic 004 focus

Local song library that ships empty: hand add, one-screen file import (gathered JSON + Poster song XML/JSON), search/pick onto a new linked slide, library manage page, linked edit/delete with deck-update confirms. Present two-line staging stays unchanged. Do not bundle church books or replace the open deck on import.

## Key paths

| Area | Path |
| --- | --- |
| Epic (loop) | `ralph/epic.md` |
| Task state | `ralph/task_status.json` |
| Domain | `src/domain/` |
| Application | `src/application/` |
| Remix adapter | `src/adapters/remix/` (`appDirectory`) |
| Electron adapter | `src/adapters/electron/main.cjs` (`package.json` main) |
| Present UI | `src/presentation/Present/Present.tsx` |
| Playwright | `tests/e2e/` |
