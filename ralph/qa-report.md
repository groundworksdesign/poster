# QA Report: directed-send-targeting

**Epic:** epic-004  
**Task:** directed-send-targeting  
**Branch:** cursor/epic-004-multi-deck-plan-doc-6573  
**Verified at:** 2026-09-02T15:50:00.000Z  
**Persona:** qa (independent; dev notes not trusted)

## Task scope

Support send to named child presentIds, or all children of that deck only; missing targets send to nobody; another deck's id is a no-op; new Present window gets a new id; replay last payload if that Present reloads.

**Also required for this loop (from operator):** present child list + send-target UI in DeckBuilder; wire sends with selected target; integration isolation tests; prefer E2E off BroadcastChannel.

**Out of scope for this task:** single-home-focus, persist-theme-all-windows, program-thumbnail.

## Tests executed (ralph/AGENT.md)

| Command | Result |
| --- | --- |
| `CI=true pnpm test --watchAll=false --testPathIgnorePatterns=e2e` | 23 suites, **143 passed** (11 skipped) |
| `CI=true pnpm test --watchAll=false --testPathPattern=directed-send-targeting\|posterSessionGraph` | 2 suites, **11 passed** (isolation + graph) |
| `CI=true REMIX_PORT=3010 pnpm exec playwright test --config=playwright.remix.config.ts remix-deck-send-smoke remix-playwright-smoke remix-lyrics-navigation remix-alignment-grid remix-visual-regression` | **22 passed**, 6 failed (see Known debt) |

## Code inspection (independent)

| Check | Finding |
| --- | --- |
| DeckBuilder present list + send-target UI | `data-testid="present-targets"` / `send-target`; options `all` + each `presentChildren` id; Close per child |
| Child tracking | `listPresents()` on connect; `onDeckEvent` `child-ready` / `child-closed`; Open Present adds id; Close calls `closePresent` |
| Sends use selected target | `handleSendClick` and `sendLyricsNavigation` pass `sendTargetRef.current` into `session.send(payload, target)` |
| Named vs all (session-scoped) | `PosterSessionGraph` send: named target only if `session.presents.has(target)`; else `[]`; `all` uses only that session's present keys |
| Missing target -> nobody | Named miss -> empty `presentIds`; no `poster:present-push` |
| Foreign presentId / other session -> no-op | Send looks up target only in **own** session map; foreign id never matches; ready rejects if presentId not in that session (`invalid-present`) |
| New presentId on spawn | `spawn` assigns `uuid()`; close removes id from list; reopen spawn differs (graph test) |
| Replay on reload | `lastPayloadByPresent` replayed on `ready` |
| No BroadcastChannel slide bus in E2E harness | `e2e/` has no `new BroadcastChannel`; remix specs use `/api/poster/deck-command` |

## Acceptance criteria mapping

Criteria belonging to **other todos** are marked **out of scope** for this task pass/fail.

| # | Criterion | Scope | Evidence | Pass |
| --- | --- | --- | --- | --- |
| 1 | Deck A send-to-A1 does not show on A2 or any B Present | in scope | `posterSessionGraph.test.js` + `directed-send-targeting.test.ts` same-named tests; graph send filters by session + named target | yes |
| 2 | Deck A send-to-all-its-children does not show on B | in scope | Graph + integration tests `send(..., 'all')` deliver A1+A2 only | yes |
| 3 | Deck B cannot drive A's children (including by guessing an id) | in scope | Graph + integration: B `send` with A's presentId delivers to neither A1 nor B1 | yes |
| 4 | Closing a Present drops it from that deck's list. Reopen gets a new presentId | in scope (task content) | Graph close removes from `list`; new spawn uuid differs; DeckBuilder Close -> `closePresent` + local list filter | yes |
| 5 | Reloading a Present still shows the last payload Main cached for it | in scope (task content) | Graph `replay last payload when present becomes ready` test | yes |
| 6 | Only one Home/Library… | out of scope | -> `single-home-focus` | n/a |
| 7 | Theme persist quit/reopen | out of scope | -> `persist-theme-all-windows` | n/a |
| 8 | Theme persist Home close/reopen | out of scope | -> `persist-theme-all-windows` | n/a |
| 9 | Program thumbnail | out of scope | -> `program-thumbnail` | n/a |
| 10 | Slide payloads are not sent on BroadcastChannel | in scope (regression) | DeckBuilder uses SessionTransport only; E2E helpers use poster API; no `new BroadcastChannel` under `e2e/` | yes |

### Operator must-confirm (explicit)

| Must confirm | Evidence | Pass |
| --- | --- | --- |
| A send-to-A1 not on A2 or B | Integration + graph tests | yes |
| A send-all not on B | Integration + graph tests | yes |
| B cannot drive A | Integration + graph tests | yes |
| Missing targets send to nobody | Integration + graph `missing target presentId` tests | yes |
| Foreign session id is a no-op | Cross-deck send guess no-op; ready with unknown presentId/session returns `invalid-present` | yes |

## Task-level deliverables

| Deliverable | Pass |
| --- | --- |
| Present child list UI in DeckBuilder | yes (`present-list` / empty state; unit + deck-send-smoke E2E) |
| Send-target selector (named or all of this session) | yes (`send-target` default `all`) |
| Wire handleSendClick + lyrics nav to selected target | yes |
| Isolation integration tests | yes (`src/integration/directed-send-targeting.test.ts`) |
| E2E off BroadcastChannel for session delivery | yes (remix smoke/lyrics/visual + shared `posterSessionE2E.ts`) |

## Known debt (not blocking this task)

- `e2e/remix-alignment-grid.spec.ts` top/bottom cases expect `top/bottom: 20px` but `Present.tsx` `getTitleOverlayStyle()` uses `0` / `0`. Overlay still receives the slide (session delivery OK). Middle row and `remix-visual-regression` title alignment screenshots passed. Fix expectations or product insets in a follow-up; not a directed-send isolation failure.

## Verdict

**PASS** — `directed-send-targeting` meets scoped requirements and the operator must-confirm isolation rules. Verified by independent code inspection, full Jest suite, isolation-focused tests, and remix session E2E (with non-blocking alignment CSS expectation debt noted above).
