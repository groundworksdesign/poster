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

## Epic-004 planning (loop 8)

- REQ-001 and REQ-002 done (directed-send + single-home-focus, passes true).
- Selected next: persist-theme-all-windows (REQ-003). localStorage + Home dropdown exist; Present does not apply theme; no program thumbnail UI yet.
