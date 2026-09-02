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

## Epic-004 planning (loop 10)

- REQ-001 through REQ-003 todos all passes true (directed-send, single-home, theme persist).
- Only pending: program-thumbnail (REQ-004). No thumbnail/preview UI in src/; present-event is ready/closed only; lastPayloadByPresent not shown to deck. Thumbnail must stay on directed path (no shared bus).
