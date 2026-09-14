# Project Memory

This file is maintained by the Ralph loop. Each plan, dev, and QA phase reads it for context and appends new discoveries.

Keep entries concise and non-obvious. Remove entries that are no longer relevant.

## Commands

- Install: `pnpm install`
- Dev: `pnpm dev` (Remix, port 3000)
- Build: `pnpm run build:remix` then `pnpm start` (`src/adapters/persistence/server.js`)
- Unit tests: `CI=true pnpm test -- --watchAll=false`
- E2E (Remix): `pnpm run test:e2e:remix`
- E2E (Electron): `pnpm run test:e2e:electron`
- Electron: `pnpm run electron`
- No dedicated lint script; ESLint via react-scripts config

## Conventions

- Clean architecture rings: domain ← application ← adapters/presentation
- Remix lives under `src/adapters/remix` (not root `app/`)
- Playwright lives under `tests/e2e` (not root `e2e/`)
- Ralph loop harness is `ralph/`; never recreate `.ralph/`

## Gotchas

- From `tests/e2e`, repo root is `../..` (two levels). `path.resolve(__dirname, '..')` incorrectly points at `tests/` after the move — known break in electronHelpers and several specs at planning loop 1.
- `playwright.remix.config.ts` already uses `path.join(__dirname, '..', '..')` correctly.
- CI `paths-ignore` includes `ralph/**`, so harness-only commits skip the full PR pipeline.

## Epic-006 planning (loop 1)

- Structural restructure already on branch / draft PR #21.
- Selected first task: fix-e2e-repo-root-paths (highest runtime risk for Electron smoke + sample-deck e2e).
- Concurrent commit `cc2233f` already applied the `../..` root fixes (and library relaunch/repoint server entry). Task stays selected for confirm + QA `passes`; do not set `passes` in planning/dev.

## Epic-006 dev (fix-e2e-repo-root-paths)

- Added `tests/e2e/repoRoot.ts` + `.cjs` (+ `repoRoot.selfcheck.cjs`).
- Wired electronHelpers, theme relaunch, home-library, library, remix library relaunch/repoint, smoke, import-validation to REPO_ROOT.
- Playwright CRA configs set `webServer.cwd` to repo root (Playwright default is the config dir = `tests/e2e`).
- Do not set `passes: true` here; QA owns that.
