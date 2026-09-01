# QA report — epic-001

| REQ | Description | Status | Notes |
| --- | --- | --- | --- |
| REQ-001 | Song finish → next deck slide | **pass** | Re-verified loop 10; 5 REQ-001 tests pass in 33-test suite. |
| REQ-002 | Showing row highlight | **pass** | Re-verified loop 10; 6 REQ-002 tests pass in 33-test suite. |
| REQ-003 | More workspace width | **pass** | Re-verified loop 10; 3 layout tests pass in 33-test suite. |
| REQ-004 | Collapsed Edit rail | **pass** | Re-verified loop 10; Close collapses to rail; 3 layout tests pass. |
| REQ-005 | Prominent Save slide | **pass** | Code + unit tests verified (loop 10). See evidence below. |
| REQ-006 | Drag-and-drop reorder | not-run | Selected next in fix_plan. |
| REQ-007 | Export / Save toolbar + Home refresh | not-run | Toolbar still `#save` + `#save-to-library` (expected pre-REQ-007). |
| REQ-008 | Unit tests (REQ-005–007) | not-run | REQ-001–005 verified; DnD/toolbar/Home refresh not in scope. |

## REQ-001 evidence (loop 3; regression checks loops 5, 8, 10)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Last stage → next deck slide | **pass** | `handleSongStageAdvance`: `nextStage >= total` → `sendSlideAtIndex(currentIndex + 1)`. |
| Loop 10 regression | **pass** | All 5 REQ-001 unit tests pass (33/33 suite). |

## REQ-002 evidence (loop 5; regression checks loops 8, 10)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Showing row + label | **pass** | `getShowingSlideId()` + `.deck-slide-item--showing` + SHOWING label. |
| Loop 10 regression | **pass** | All 6 REQ-002 unit tests pass (33/33 suite). |

## REQ-003 + REQ-004 evidence (loop 8; regression check loop 10)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Idle list width + collapsed Edit rail | **pass** | `App.css` idle `flex: 1`; rail when not expanded; 42% split only when expanded. |
| Edit expands / Close collapses | **pass** | `isSlideEditorExpanded` gates panel vs rail; `collapseSlideEditor()` on Close. |
| Loop 10 regression | **pass** | All 3 REQ-003+004 unit tests pass (33/33 suite). |

## REQ-005 evidence (loop 10 — independent QA)

### Code review

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Prominent Save slide in expanded editor (not toolbar Export/library Save) | **pass** | Header L1161–1170 + footer L1317–1324: `Save slide` with `deck-slide-editor-save-btn`, `data-testid="save-slide-button"`. Toolbar unchanged: `#save` "Save" (file) L916, `#save-to-library` L917 — not renamed (REQ-007 deferred). |
| Edits held in draft until Save | **pass** | `slideEditDraft` state L35–36; editor reads draft L1173+; `updateDraftField` / `updateDraftStyle` mutate draft only L297–326. |
| Save persists slide to in-memory deck | **pass** | `saveSlideEdits()` L328–358: writes draft into `deck.slides[selectedSlideIndex]`, `setDeck(newDeck)`, `syncSentSlideIfNeeded`, lyrics flush for SONG type. |
| Successful save collapses to rail | **pass** | `saveSlideEdits()` ends with `collapseSlideEditor()` L357; clears draft + `selectedSlideIndex`. |
| Close without save discards draft | **pass** | `collapseSlideEditor()` L292–295 clears draft without `setDeck`; deck unchanged until Save slide. |
| No placeholders / stubs | **pass** | Full draft commit path; no TODO/FIXME in save flow. |

### Tests run (loop 10)

**Command:**

```bash
CI=true npx react-scripts test --watchAll=false --testPathPattern=DeckBuilder.unit.test
```

**Result:** 1 suite passed, **33 tests passed**, 0 failed (2026-09-01).

REQ-005 tests (3):

- `REQ-005: expanded editor shows prominent Save slide in header and footer`
- `REQ-005: unsaved title edits stay in draft until Save slide commits to deck`
- `REQ-005: Save slide collapses editor; re-open Edit shows persisted title`

REQ-001 regression (5), REQ-002 regression (6), REQ-003+004 regression (3), and 16 baseline tests also passed in the same run.

## Global checks

| Check | Status | Notes |
| --- | --- | --- |
| No app-wide restyle | **pass** | Save button CSS scoped to `.deck-slide-editor-save-btn` |
| Toolbar labels unchanged (REQ-007) | **pass** | Still `Save` + `Save to Library`, not Export/rename |
| PR #12 not merged | **pass** | No merge performed |
| No open PR for epic work | **pass** | No open PR on branch |

## Run metadata

- **Loop:** 10 (QA)
- **Commit verified:** `eb1d046` (branch `cursor/ralph-epic-001-plan-8243`)
- **Tester:** QA agent (loop 10)
