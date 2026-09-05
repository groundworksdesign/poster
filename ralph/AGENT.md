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

- Work on the branch recorded in `ralph/task_status.json`.
- Read `ralph/epic.md` and `ralph/task_status.json` before each loop.
- Planning loop: search the codebase before assuming something is unimplemented; set `selected` to the single most important remaining task.
- Dev loop: implement only the selected task; follow existing patterns in `electron/`, `src/`, and `app/`.
- QA loop: verify against acceptance criteria; do not change product code.
- Out of scope unless epic changes: BroadcastChannel-with-filter, `BrowserWindow({ parent })` for Present, a second Home window.
- After a task passes QA, commit on the working branch with `[skip ci]` in the message for intermediate commits.
- Do **not** open or push to a PR until `completeEpic` is `true` in `ralph/task_status.json`.
- Do not overwrite `ralph/PROMPT_*.md` files once created; add missing prompts only.
- Do not replace the `ralph/` folder or create a parallel `.ralph/` tree.

## Key paths

| Area | Path |
| --- | --- |
| Epic (loop) | `ralph/epic.md` |
| Task state | `ralph/task_status.json` |
| Electron main | `electron/main.cjs` |
| Deck send path | `src/Deck/DeckBuilder.tsx`, `src/Present/Broadcast.ts` |
| Present view | `src/Present/Present.tsx` |
| Home | `src/HomePage.tsx` |
| Theme | `src/utils/useTheme.ts`, `app/root.tsx` |
