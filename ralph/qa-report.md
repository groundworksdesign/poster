# QA Report: directed-send-main-switch

**Epic:** epic-004  
**Task:** directed-send-main-switch  
**Branch:** cursor/epic-004-multi-deck-plan-doc-6573  
**Verified at:** 2026-09-02T14:46:00.000Z  
**Persona:** qa (independent; dev notes not trusted)

## Task scope

Replace the shared BroadcastChannel / handleSendClick / PresentData slide bus with a Main-owned session graph and four fixed channels so a deck posts only to the chosen Present Window.

**Out of scope for this task:** directed-send-targeting, single-home-focus, persist-theme-all-windows, program-thumbnail.

## Tests executed (ralph/AGENT.md)

| Command | Result |
| --- | --- |
| `CI=true pnpm test --watchAll=false --testPathPattern=posterSessionGraph\|presentation\|presentData\|deck-to-presentation\|DeckBuilder.unit\|electron-main` | 7 suites, **61 passed** |
| `CI=true pnpm test --watchAll=false --testPathIgnorePatterns=e2e` | 22 suites, **133 passed** (11 skipped) |

## Code inspection (independent)

| Check | Finding |
| --- | --- |
| Main-owned session graph | `shared/posterSessionGraph.cjs`; used by `electron/sessionIpc.cjs` and `server/posterSessionRelay.js` |
| Four fixed channels | `poster:deck-command`, `poster:present-push`, `poster:present-event`, `poster:deck-event` in `electron/preload.cjs`, `electron/sessionIpc.cjs`, graph deliver |
| Deck send path | `DeckBuilder.tsx` `handleSendClick` calls `deckSessionRef.current?.send(payload)` — no `BroadcastChannel.postMessage` |
| Present receive path | `Present.tsx` uses `createPresentSession` + `onPresentPush`; requires `?sessionId=&presentId=` |
| BroadcastChannel removed from app | `src/Present/Broadcast.ts` `connect()` throws; grep of `src/` shows no `new BroadcastChannel` |
| Deck never talks to Present directly | All routing through graph / HTTP relay |
| No `BrowserWindow({ parent })` | No `parent:` in `electron/` |
| Spawn assigns new presentId | `PosterSessionGraph.handleDeckCommand({ type: 'spawn' })` uses `uuid()` |
| Payload cache + replay | `lastPayloadByPresent`; replay on `ready` in `handlePresentEvent`; test in `posterSessionGraph.test.js` |
| Browser-mode relay | `server/index.js` mounts `mountPosterSessionRelay(app)` before Remix handler |

## Acceptance criteria mapping (epic Validation section)

Criteria belonging to **other todos** are marked **out of scope** for this task pass/fail.

| # | Criterion | Scope | Evidence | Pass |
| --- | --- | --- | --- | --- |
| 1 | Deck A send-to-A1 does not show on A2 or any B Present | out of scope | Named targeting / multi-deck isolation → `directed-send-targeting` | n/a |
| 2 | Deck A send-to-all-its-children does not show on B | out of scope | Cross-session isolation → `directed-send-targeting` | n/a |
| 3 | Deck B cannot drive A's children (including by guessing an id) | out of scope | Cross-deck id validation → `directed-send-targeting` | n/a |
| 4 | Closing a Present drops it from that deck's list. Reopen gets a new presentId | partial (main-switch) | Graph `close`/`unregister` + `spawn` uuid in `posterSessionGraph.cjs`; deck child-list UI deferred | yes (graph layer) |
| 5 | Reloading a Present still shows the last payload Main cached for it | in scope | `handlePresentEvent` ready replays cache; `posterSessionGraph.test.js` "replay last payload" | yes |
| 6 | Only one Home/Library exists… | out of scope | → `single-home-focus` | n/a |
| 7 | After choosing a theme… quit and reopen | out of scope | → `persist-theme-all-windows` | n/a |
| 8 | Close the main Home window and open it again: same theme restore | out of scope | → `persist-theme-all-windows` | n/a |
| 9 | A deck shows a thumbnail of what is on program | out of scope | → `program-thumbnail` | n/a |
| 10 | Slide payloads are not sent on BroadcastChannel | in scope | App code uses SessionTransport only; `Broadcast.ts` throws; unit/integration tests pass without BroadcastChannel | yes |

## Task-level deliverables (directed-send-main-switch)

| Deliverable | Pass |
| --- | --- |
| Main-owned session graph | yes |
| Four fixed IPC channel names | yes |
| Kill BroadcastChannel slide bus in app code | yes |
| Deck → main → present routing (not deck → present) | yes |
| Logical child (no Electron parent window) | yes |
| Foundation for directed send (spawn, send, list, close commands) | yes |

## Known debt (not blocking this task)

- E2E specs under `e2e/` (e.g. `remix-visual-regression.spec.ts`) still inject slides via `BroadcastChannel('presentation')`; migration belongs to a follow-up loop.
- `HomePage.tsx` still has legacy "Open presentation" link without session params; session-aware flow is via DeckBuilder **Open Present** button.

## Verdict

**PASS** — `directed-send-main-switch` meets its scoped requirements. Architecture and in-scope acceptance criteria verified by independent code inspection and passing unit tests.
