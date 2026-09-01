# QA report — epic-001

| REQ | Description | Status | Notes |
| --- | --- | --- | --- |
| REQ-001 | Song finish → next deck slide | **pass** | Re-verified loop 12; 5 REQ-001 tests pass in 36-test suite. |
| REQ-002 | Showing row highlight | **pass** | Re-verified loop 12; 6 REQ-002 tests pass in 36-test suite. |
| REQ-003 | More workspace width | **pass** | Re-verified loop 12; 3 layout tests pass in 36-test suite. |
| REQ-004 | Collapsed Edit rail | **pass** | Re-verified loop 12; 3 layout tests pass in 36-test suite. |
| REQ-005 | Prominent Save slide | **pass** | Re-verified loop 12; 3 Save slide tests pass in 36-test suite. |
| REQ-006 | Drag-and-drop reorder | **pass** | Code + unit tests verified (loop 12). See evidence below. |
| REQ-007 | Export / Save toolbar + Home refresh | not-run | Selected next in fix_plan. Toolbar still `#save` + `#save-to-library`. |
| REQ-008 | Unit tests (REQ-005–007) | not-run | REQ-001–006 verified; toolbar/Home refresh not in scope. |

## REQ-001 evidence (loop 3; regression checks loops 5, 8, 10, 12)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Last stage → next deck slide | **pass** | `handleSongStageAdvance`: `nextStage >= total` → `sendSlideAtIndex(currentIndex + 1)`. |
| Loop 12 regression | **pass** | All 5 REQ-001 unit tests pass (36/36 suite). |

## REQ-002 evidence (loop 5; regression checks loops 8, 10, 12)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Showing row + label | **pass** | `getShowingSlideId()` + `.deck-slide-item--showing` + SHOWING label. |
| Showing after reorder (by id) | **pass** | `REQ-002: Showing follows slide id after Top reorder`; `REQ-006: Showing follows slide id after drag reorder`. |
| Loop 12 regression | **pass** | All 6 REQ-002 unit tests pass (36/36 suite). |

## REQ-003 + REQ-004 evidence (loop 8; regression check loops 10, 12)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Idle list width + collapsed Edit rail | **pass** | `App.css` idle `flex: 1`; rail when not expanded; 42% split only when expanded. |
| Edit expands / Close collapses | **pass** | `isSlideEditorExpanded` gates panel vs rail; `collapseSlideEditor()` on Close. |
| Loop 12 regression | **pass** | All 3 REQ-003+004 unit tests pass (36/36 suite). |

## REQ-005 evidence (loop 10; regression check loop 12)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Save slide draft + commit + collapse | **pass** | `slideEditDraft`, `saveSlideEdits()`, header/footer Save slide buttons. |
| Loop 12 regression | **pass** | All 3 REQ-005 unit tests pass (36/36 suite). |

## REQ-006 evidence (loop 12 — independent QA)

### Code review

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| No ↑/↓ on slide rows | **pass** | Grep `DeckBuilder.tsx`: no `moveSlide`, no ↑/↓ buttons. Only historical refs in `.ralph/`. Unit test asserts `#slides` text does not match `/↑\|↓/`. |
| Drag handle present | **pass** | `deck-slide-drag-handle` L1093–1107: `draggable`, `data-testid="deck-slide-drag-handle"`, `::` grip. CSS `.deck-slide-drag-handle` in `App.css`. |
| Drag uses shared `reorderSlide` | **pass** | `onDrop` L1088: `reorderSlide(fromIndex, index)`. Same function as Top L789 and Move L796. |
| Top still works | **pass** | `moveSlideToTop` → `reorderSlide(index, 0)` L787–789; Top button L1157. |
| Move-to-number still works | **pass** | `moveSlideToNumber` → `reorderSlide(fromIndex, toIndex)` L792–796; Move button L1167–1174. |
| Showing stays on slide identity after reorder | **pass** | Highlight keyed on `getShowingSlideId()` / `lastSentSlideId` vs `data-slide-id`; not list index. `adjustPresentIndexAfterReorder` updates index tracking separately. |
| No app-wide restyle | **pass** | Scoped list header hint + drag handle CSS only. |
| No placeholders / stubs | **pass** | Full HTML5 DnD path; no TODO/FIXME in reorder flow. |

### Tests run (loop 12)

**Command:**

```bash
CI=true npx react-scripts test --watchAll=false --testPathPattern=DeckBuilder.unit.test
```

**Result:** 1 suite passed, **36 tests passed**, 0 failed (2026-09-01).

REQ-006 tests (3):

- `slide row includes drag handle, Top and Move reorder controls (no up/down arrows)`
- `REQ-006: drag handle reorders slides via shared reorderSlide`
- `REQ-006: Move-to-number still reorders slides`
- `REQ-006: Showing follows slide id after drag reorder, not stale index`

REQ-001 regression (5), REQ-002 regression (6), REQ-003+004 regression (3), REQ-005 regression (3), and 16 baseline tests also passed in the same run.

## Global checks

| Check | Status | Notes |
| --- | --- | --- |
| No app-wide restyle | **pass** | DnD CSS scoped to slide list |
| Toolbar labels unchanged (REQ-007) | **pass** | Still `Save` + `Save to Library` |
| PR #12 not merged | **pass** | No merge performed |
| No open PR for epic work | **pass** | No open PR on branch |

## Run metadata

- **Loop:** 12 (QA)
- **Commit verified:** `9c87188` (branch `cursor/ralph-epic-001-plan-8243`)
- **Tester:** QA agent (loop 12)
