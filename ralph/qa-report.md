# QA Report: program-thumbnail

**Epic:** epic-004  
**Task:** program-thumbnail  
**Branch:** cursor/epic-004-multi-deck-plan-doc-6573  
**Verified at:** 2026-09-02T16:25:00.000Z  
**Persona:** qa (independent; dev notes not trusted)

## Task scope

Show a thumbnail in the deck of what is on program. Present reports program state to Main via `poster:present-event`; Main forwards only to the owning deck via `poster:deck-event`. Do not put slide payloads or thumbs on BroadcastChannel.

**Out of scope for this task:** directed-send, single-home, theme persist (already passes).

## Tests executed (ralph/AGENT.md)

| Command | Result |
| --- | --- |
| `CI=true pnpm test --watchAll=false --testPathIgnorePatterns=e2e` | 28 suites, **164 passed** (11 skipped) |
| Focused coverage: `programThumbnail`, `posterSessionGraph` (included in full run) | graph isolation + Present→deck event + panel UI |
| `CI=true REMIX_PORT=3022 pnpm exec playwright test --config=playwright.remix.config.ts remix-program-thumbnail` | **1 passed** |

## Code inspection (independent)

| Check | Finding |
| --- | --- |
| Deck shows thumbnail UI | `ProgramThumbnailPanel` mounted in `DeckBuilder`; listens for `program-thumbnail` deck-events; empty state `program-thumbnail-empty` |
| Present reports to Main | `Present.tsx` builds snapshot via `buildProgramThumbnail` and calls `session.reportProgramState` |
| Transport is present-event | `reportProgramState` → `presentEvent({ type: 'program-state' })` (Electron) or `POST /api/poster/present-event` (HTTP) |
| Main forwards only owning deck | `PosterSessionGraph.handlePresentEvent` on `program-state` delivers `poster:deck-event` `{ type: 'program-thumbnail' }` to `session.deckPeerId` only |
| Isolation | Unit test: deck A gets thumbnail; deck B receives zero `program-thumbnail` events |
| No BroadcastChannel for slides/thumbs | `Broadcast.ts` throws; send/thumb path uses SessionTransport + session graph channels only |

## Acceptance criteria mapping

Criteria belonging to **other todos** are marked **out of scope**.

| # | Criterion | Scope | Evidence | Pass |
| --- | --- | --- | --- | --- |
| 1-5 | Directed-send isolation / close / replay | out of scope | REQ-001 already passes | n/a |
| 6 | Single Home | out of scope | REQ-002 already passes | n/a |
| 7-8 | Theme persist | out of scope | REQ-003 already passes | n/a |
| 9 | A deck shows a thumbnail of what is on program. | **in scope** | Deck panel + E2E title/subtitle after Send; integration Present→deck-event | yes |
| 10 | Slide payloads are not sent on BroadcastChannel. | **in scope** (regression) | Broadcast transport removed; directed channels only; no BC for program-state | yes |

### Operator must-confirm

| Must confirm | Evidence | Pass |
| --- | --- | --- |
| Deck shows thumbnail of what is on program | `ProgramThumbnailPanel`; E2E `program-thumbnail-title` / subtitle after Present receives send | yes |
| Present reports program state to Main | `Present.tsx` → `reportProgramState` → `poster:present-event` `program-state` | yes |
| Main forwards only to the owning deck | Graph delivers to `deckPeerId` only; unit test deck B gets none | yes |
| No BroadcastChannel for slides or thumbs | Deprecated Broadcast throws; SessionTransport + graph only | yes |

## Task-level deliverables

| Deliverable | Pass |
| --- | --- |
| Directed Present → Main → owning deck thumbnail path | yes |
| Deck On program UI | yes |
| Tests for REQ-004 Validation item | yes (`posterSessionGraph`, programThumbnail unit/integration, `remix-program-thumbnail`) |

## Verdict

**PASS** — `program-thumbnail` meets REQ-004 scoped requirements and the operator must-confirm checks. Verified by independent code inspection, full Jest suite, and remix program-thumbnail E2E.
