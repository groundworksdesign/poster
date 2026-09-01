# QA report — epic-001

| REQ | Description | Status | Notes |
| --- | --- | --- | --- |
| REQ-001 | Song finish → next deck slide | **pass** | Code + unit tests verified (loop 3). See evidence below. |
| REQ-002 | Showing row highlight | not-run | |
| REQ-003 | More workspace width | not-run | |
| REQ-004 | Collapsed Edit rail | not-run | |
| REQ-005 | Prominent Save slide | not-run | |
| REQ-006 | Drag-and-drop reorder | not-run | |
| REQ-007 | Export / Save toolbar + Home refresh | not-run | |
| REQ-008 | Unit tests (REQ-002–007) | not-run | REQ-001 tests verified; remaining REQs not in scope. |

## REQ-001 evidence (loop 3 — independent QA)

### Code review

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Next after last song stage → next deck slide | **pass** | `navigatePresentationNext` (L318–328) delegates to `handleSongStageAdvance` when on a song slide. |
| Right-arrow → same path as Next | **pass** | `keyHandlerRef` ArrowRight (L63–65) calls `navigatePresentationNext()`. |
| Row Advance → same last-stage rule | **pass** | Slide row Advance (L1002) and editor Advance (L1175) call `handleSongStageAdvance(slide)` directly. |
| No `% total` wrap in advance path | **pass** | `handleSongStageAdvance` (L369–375): `nextStage = last === undefined ? 0 : last + 1`; when `nextStage >= total`, calls `sendSlideAtIndex(currentIndex + 1)`. Repo grep: no `(last + 1) % total`. |
| Mid-song advance steps lyrics | **pass** | L377–379: when `nextStage < total`, sends `buildStagedSongSlide(full, nextStage)`. |
| Last deck slide does not wrap | **pass** | L370–375: if `currentIndex >= deck.slides.length - 1`, returns without sending (no stage-0 restart). |
| Previous / Reverse / left-arrow inverse | **pass** | `navigatePresentationPrevious` (L334–347) + `handleSongStageReverse` (L382–397) unchanged; `canReverseSongStage` gates reverse while stage > 0. Left-arrow calls `navigatePresentationPrevious` (L66–68). |
| End still blanks | **pass** | `navigatePresentationEnd` → `sendBlankSlide` → `handleSendClick({ slide: null })` (L314–316, L300–303, L238–244). |
| No placeholders / stubs in REQ-001 path | **pass** | No TODO/FIXME/stub in `handleSongStageAdvance` or navigation helpers. `buildStagedSongSlide` uses `% totalStages` only to clamp stage index (not deck navigation wrap). |

### Tests run

**Command:**

```bash
CI=true npx react-scripts test --watchAll=false --testPathPattern=DeckBuilder.unit.test
```

**Result:** 1 suite passed, **23 tests passed**, 0 failed (2026-09-01).

Includes 5 REQ-001 tests (would fail if wrap-to-start returned):

- `REQ-001: Presentation Next after last song stage sends next deck slide`
- `REQ-001: right-arrow after last song stage sends next deck slide`
- `REQ-001: song row Advance after last stage sends next deck slide`
- `REQ-001: mid-song Next still advances lyric stages`
- `REQ-001: last deck slide song does not wrap to song start`

**PR #12 baseline Deck tests:** all 18 pre-REQ-001 tests in the same file also passed (presentation controls, Top/Move, green-screen Start, import/save, editor layout, etc.).

## Global checks

| Check | Status | Notes |
| --- | --- | --- |
| No app-wide restyle | not-run | Out of loop 3 scope |
| No new long-lived Actions artifacts | not-run | Out of loop 3 scope |
| PR #12 not merged | **pass** | No merge performed; work on branch only |
| No open PR for epic work | **pass** | PR #13 closed; no new PR opened |

## Run metadata

- **Loop:** 3 (QA)
- **Commit verified:** `1e22b1f` (branch `cursor/ralph-epic-001-plan-8243`)
- **Tester:** QA agent (loop 3)
