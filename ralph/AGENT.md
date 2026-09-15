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

- Work on the branch recorded in `ralph/task_status.json` (`cursor/clean-architecture-restructure-018c`).
- Read `ralph/epic.md` and `ralph/task_status.json` before each loop.
- Planning loop: search the codebase before assuming something is unimplemented; set `selected` to the single most important remaining task; no product code.
- Dev loop: implement only the selected task.
- QA loop: verify against acceptance criteria; only QA sets `passes: true`; do not change product code in QA.
- One task per loop.
- After a task passes QA, commit on the working branch with `[skip ci]` in intermediate commit messages until release.
- Draft PR #21 already exists — push this branch only; do not open a second PR; do not mark ready or merge.
- Do not overwrite `ralph/PROMPT_*.md` files once created; add missing prompts only.
- Do not create a parallel `.ralph/` tree. `ralph/` is the loop harness for this epic.

## Key paths (post clean-architecture move)

| Area | Path |
| --- | --- |
| Epic (loop) | `ralph/epic.md` |
| Task state | `ralph/task_status.json` |
| Domain | `src/domain/` |
| Application | `src/application/` |
| Remix adapter | `src/adapters/remix/` (`appDirectory`) |
| Electron adapter | `src/adapters/electron/main.cjs` (`package.json` main) |
| Persistence / Express | `src/adapters/persistence/server.js` |
| Realtime relay | `src/adapters/realtime/` |
| Presentation UI | `src/presentation/` |
| Playwright | `tests/e2e/` |
