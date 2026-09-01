# Ralph agent instructions (epic-001)

## Install

```bash
pnpm install
```

Optional (SQLite native module on supported Node):

```bash
pnpm run rebuild:sqlite
```

## Run the app

Full app with library APIs (recommended):

```bash
pnpm dev
```

Open http://localhost:3000. Deck builder: `/deck`. Presentation: `/presentation`.

## Run unit tests

Interactive (watch):

```bash
pnpm test
```

Single run (CI-style):

```bash
CI=true pnpm test -- --watchAll=false
```

Target one file:

```bash
CI=true pnpm test -- --watchAll=false src/Deck/DeckBuilder.unit.test.tsx
```

## Signs (follow every loop)

- **One task per loop.** Complete exactly the selected item in `.ralph/fix_plan.md`; do not batch unrelated REQs.
- **Before changes, search the codebase; do not assume missing.** Read `DeckBuilder.tsx`, related utils, CSS, and existing tests first.
- **After changes, run tests for the unit you changed.** At minimum the touched `*.test.tsx` / `*.test.ts` files; keep PR #12 tests green.
- **New tests must document why they exist.** Comment or test name should tie to a REQ (e.g. REQ-001 song advance).
- **No placeholders / stubs / TODO-implement-later.** Ship working behavior or revert.
- **Do not restyle the whole app.** Match the planning mock intent only; preserve Poster’s existing theme tokens.
- **Do not change CI artifact retention or packaging** unless a test harness requires it.
- **Do not merge PR #12.** Work on branch `cursor/deck-editor-ux-d46a` or a descendant; keep PR #12 open.

## Branch

Base: `cursor/deck-editor-ux-d46a` (PR #12). Push feature branches as `cursor/<descriptive-name>-8243`.
