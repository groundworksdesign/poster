# QA report — epic-002

## Verdict

`<status>verified</status>` — all epic-002 todos pass.

## Tip

`8221cd2` on `cursor/epic-002-first-title-font-size-7e0c` (PR #24 draft).

## Evidence

| Check | Result |
|-------|--------|
| `pnpm exec tsc --noEmit` | exit 0 |
| `CI=true pnpm exec react-scripts test --watchAll=false --runInBand` | 43 suites / 284 tests PASS |
| createNewDeck omits baked title sizes | PASS (export assertion) |
| Font size → Send first title uses GENERAL | PASS (mockSend payload) |
| Baked import keeps 48px/28px after Font size | PASS |
| Jack precedence cases (`fontSizePrecedence.test.ts`) | PASS |

## Merge gate

Do **not** merge. Jack is merge gate.
