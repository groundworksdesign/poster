# Project Memory

This file is maintained by the Ralph loop. Each plan, dev, and QA phase reads it for context and appends new discoveries.

Keep entries concise and non-obvious. Remove entries that are no longer relevant.

## Commands

- Install: `pnpm install`
- Dev: `pnpm dev` (Remix, port 3000)
- Build: `pnpm run build:remix` then `pnpm start`
- Unit tests: `CI=true pnpm test -- --watchAll=false`
- E2E (Remix): `pnpm run test:e2e:remix`
- Electron: `pnpm run electron`
- No dedicated lint script; ESLint via react-scripts config

## Conventions

<!-- Code patterns, naming conventions, and project standards. Example:
- Use named exports (no default exports)
- Tests live alongside source files as *.test.ts
-->

## Gotchas

<!-- Non-obvious issues, environment quirks, or things that caused failures. Example:
- Windows paths require backslashes in spawn() args
- npm install must run before tsx can resolve modules
-->

## Epic-004 planning (loop 6)

- REQ-001 done (directed-send-main-switch + directed-send-targeting, passes true).
- Selected next: single-home-focus (REQ-002). Electron single-instance lock exists; Home still links Open presentation to bare /presentation; Present does not use useTheme yet; no program thumbnail UI.
