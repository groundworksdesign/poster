# QA Report: epic-004 completion check

**Epic:** epic-004  
**Selected:** null (epic completion check)  
**Branch:** cursor/epic-004-multi-deck-plan-doc-6573  
**Verified at:** 2026-09-02T16:30:00.000Z  
**Persona:** qa (independent; prior notes not trusted)

## Scope

Confirm every epic-004 todo still has `passes: true` and still holds in code + tests: directed-send-main-switch, directed-send-targeting, single-home-focus, persist-theme-all-windows, program-thumbnail. If all pass, set `completeEpic: true` and `status: complete`.

## Tests executed (ralph/AGENT.md)

| Command | Result |
| --- | --- |
| `CI=true pnpm test --watchAll=false --testPathIgnorePatterns=e2e` | 28 suites, **164 passed** (11 skipped) |
| `CI=true REMIX_PORT=3025 pnpm exec playwright test --config=playwright.remix.config.ts remix-deck-send-smoke remix-single-home remix-theme-persist remix-program-thumbnail` | **8 passed** |

## Per-task re-verification

| Todo | passes | Still holds (independent) | Evidence |
| --- | --- | --- | --- |
| directed-send-main-switch | true | yes | SessionTransport + PosterSessionGraph; Broadcast.ts throws; DeckBuilder uses createDeckSession; deck-send E2E + graph/integration tests |
| directed-send-targeting | true | yes | Graph send target/all/missing/cross-deck isolation; `directed-send-targeting.test.ts`; posterSessionGraph tests |
| single-home-focus | true | yes | `ensureHomeWindow` / `shouldCreateHomeWindow` / classifyOpenUrl; Home Open Presentation → deck; remix-single-home E2E; homeWindowPolicy + electron regression |
| persist-theme-all-windows | true | yes | useTheme + Home dropdown + Deck/Present apply; FOUC script; remix-theme-persist E2E (3) |
| program-thumbnail | true | yes | Present `program-state` → Main → owning deck `program-thumbnail`; ProgramThumbnailPanel; remix-program-thumbnail E2E |

## Acceptance criteria (full epic)

| # | Criterion | Pass |
| --- | --- | --- |
| 1 | Deck A send-to-A1 does not show on A2 or any B Present | yes |
| 2 | Deck A send-to-all-its-children does not show on B | yes |
| 3 | Deck B cannot drive A's children (including by guessing an id) | yes |
| 4 | Closing a Present drops it; reopen gets a new presentId | yes |
| 5 | Reloading a Present still shows last payload Main cached | yes |
| 6 | Only one Home; Open Presentation opens deck; Present plays slides | yes |
| 7 | Theme + dropdown restore on app restart on Home/decks/Presents | yes |
| 8 | Theme restore on Home close/reopen | yes |
| 9 | Deck shows thumbnail of what is on program | yes |
| 10 | Slide payloads are not sent on BroadcastChannel | yes |

## Verdict

**PASS — epic complete.** All five todos remain `passes: true` and still hold under independent code inspection and AGENT.md Jest + remix E2E. Set `completeEpic: true`, `status: complete`, `selected: null`.
