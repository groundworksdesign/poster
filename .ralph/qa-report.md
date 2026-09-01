# QA report — epic-001

| REQ | Description | Status | Notes |
| --- | --- | --- | --- |
| REQ-001 | Song finish → next deck slide | **pass** | Re-verified loop 5; no regression (5 REQ-001 tests + code unchanged). |
| REQ-002 | Showing row highlight | **pass** | Code + unit tests verified (loop 5). See evidence below. |
| REQ-003 | More workspace width | not-run | |
| REQ-004 | Collapsed Edit rail | not-run | |
| REQ-005 | Prominent Save slide | not-run | |
| REQ-006 | Drag-and-drop reorder | not-run | |
| REQ-007 | Export / Save toolbar + Home refresh | not-run | |
| REQ-008 | Unit tests (REQ-003–007) | not-run | REQ-001–002 tests verified; remaining REQs not in scope. |

## REQ-001 evidence (loop 3; regression check loop 5)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Last stage → next deck slide (Next / right-arrow / Advance) | **pass** | `handleSongStageAdvance` L376–382: `nextStage >= total` → `sendSlideAtIndex(currentIndex + 1)`; no `% total` wrap. |
| Mid-song lyrics step | **pass** | L384–386: staged send when `nextStage < total`. |
| Last deck slide no wrap | **pass** | L380–382: no-op when no next slide. |
| Loop 5 regression | **pass** | All 5 REQ-001 unit tests still pass (29/29 suite). |

## REQ-002 evidence (loop 5 — independent QA)

### Code review

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Distinct Showing background + label (mock intent) | **pass** | `.deck-slide-item--showing` (App.css L420–423): teal/green via `--color-link-present` mix; `.deck-slide-showing-label` (L433–438): SHOWING text in `--color-link-present`. Not applied on Edit (`selectedSlideIndex` is separate state). |
| Only one row Showing | **pass** | `isShowing = slideId === showingSlideId` (DeckBuilder L971); single id match. |
| Send updates Showing | **pass** | Send handler L987–999 → `handleSendClick` sets `lastSentSlideId`; test `REQ-002: Send updates Showing`. |
| Start updates Showing | **pass** | `navigatePresentationStart` → `sendSlideAtIndex` → `handleSendClick`; test `REQ-002: Start marks exactly one Showing row`. |
| Next / Previous update Showing | **pass** | `navigatePresentationNext/Previous` → `sendSlideAtIndex` or song stage (same `lastSentSlideId` on song); test `REQ-002: Next and Previous update Showing row`. |
| Go updates Showing | **pass** | `navigatePresentationJump` → `sendSlideAtIndex`; test `REQ-002: Go updates Showing`. |
| End clears Showing (no stale row) | **pass** | `handleSendClick({ slide: null })` clears `lastSentSlideId`, sets `presentationBlank`; `getShowingSlideId()` returns null (L260–262). Test `REQ-002: End clears all Showing rows`. |
| Identity-based, not index | **pass** | `getShowingSlideId()` returns `lastSentSlideId` when not blank — not `presentSlideIndex` or map index (L260–262). Row match: `slideId === showingSlideId` (L971). Test `REQ-002: Showing follows slide id after Top reorder`. |
| Distinct from editing | **pass** | Edit sets `selectedSlideIndex` only; no `--showing` class tied to edit state. |
| No placeholders / stubs | **pass** | No TODO/FIXME/stub in showing path. Editor placeholder text is unrelated UI copy. |

### Tests run (loop 5)

**Command:**

```bash
CI=true npx react-scripts test --watchAll=false --testPathPattern=DeckBuilder.unit.test
```

**Result:** 1 suite passed, **29 tests passed**, 0 failed (2026-09-01).

REQ-002 tests (6):

- `REQ-002: Start marks exactly one Showing row by slide id`
- `REQ-002: End clears all Showing rows`
- `REQ-002: Send updates Showing to the sent slide`
- `REQ-002: Next and Previous update Showing row`
- `REQ-002: Go updates Showing to jumped slide`
- `REQ-002: Showing follows slide id after Top reorder`

REQ-001 regression (5 tests) and 18 PR #12 baseline tests also passed in the same run.

## Global checks

| Check | Status | Notes |
| --- | --- | --- |
| No app-wide restyle | not-run | Loop 5 scoped to REQ-002 verification |
| No new long-lived Actions artifacts | not-run | Out of loop 5 scope |
| PR #12 not merged | **pass** | No merge performed |
| No open PR for epic work | **pass** | PR #13 closed; no open PR on branch |

## Run metadata

- **Loop:** 5 (QA)
- **Commit verified:** `e3701b5` (branch `cursor/ralph-epic-001-plan-8243`)
- **Tester:** QA agent (loop 5)
