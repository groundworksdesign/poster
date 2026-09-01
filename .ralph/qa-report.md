# QA report — epic-001

| REQ | Description | Status | Notes |
| --- | --- | --- | --- |
| REQ-001 | Song finish → next deck slide | **pass** | Re-verified loop 8; 5 REQ-001 tests pass in 30-test suite. |
| REQ-002 | Showing row highlight | **pass** | Re-verified loop 8; 6 REQ-002 tests pass in 30-test suite. |
| REQ-003 | More workspace width | **pass** | Code + unit tests verified (loop 8). See evidence below. |
| REQ-004 | Collapsed Edit rail | **pass** | Code + unit tests verified (loop 8). See evidence below. |
| REQ-005 | Prominent Save slide | not-run | Selected next in fix_plan. |
| REQ-006 | Drag-and-drop reorder | not-run | |
| REQ-007 | Export / Save toolbar + Home refresh | not-run | |
| REQ-008 | Unit tests (REQ-005–007) | not-run | REQ-001–004 verified; remaining REQs not in scope. |

## REQ-001 evidence (loop 3; regression checks loops 5, 8)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Last stage → next deck slide | **pass** | `handleSongStageAdvance`: `nextStage >= total` → `sendSlideAtIndex(currentIndex + 1)`. |
| Loop 8 regression | **pass** | All 5 REQ-001 unit tests pass (30/30 suite). |

## REQ-002 evidence (loop 5; regression check loop 8)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Showing row + label | **pass** | `getShowingSlideId()` + `.deck-slide-item--showing` + SHOWING label. |
| Loop 8 regression | **pass** | All 6 REQ-002 unit tests pass (30/30 suite). |

## REQ-003 + REQ-004 evidence (loop 8 — independent QA)

### Code review

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Idle list uses more width (not 42% beside empty editor) | **pass** | `App.css` L455–457: `:not(.deck-slides-editor-row--expanded) .deck-slides-list { flex: 1 1 auto; }`. Expanded-only 42% at L460–462. No always-on editor column when idle. |
| Idle: collapsed Edit rail labeled Edit | **pass** | `DeckBuilder.tsx` L1230–1233: `deck-slide-editor-rail` + `deck-slide-editor-rail-label` "Edit". Vertical label CSS L483–491. |
| No full-width placeholder editor pane | **pass** | Grep: no `deck-slide-editor-placeholder` or "Click Edit on a slide" in `DeckBuilder.tsx`. Idle renders rail only (L1230–1233), not editor panel. |
| Edit expands editor | **pass** | `isSlideEditorExpanded` (L265–268) gates L1070–1229 `deck-slide-editor-panel` vs rail. Row Edit sets `selectedSlideIndex`. |
| Close collapses to rail | **pass** | `collapseSlideEditor()` (L271) wired to Close editor (L1219) → `setSelectedSlideIndex(null)`. |
| Scoped layout (no app-wide restyle) | **pass** | Changes limited to `.deck-slides-editor-row`, list, rail, editor classes in `App.css`. |
| No placeholders / stubs | **pass** | No TODO/FIXME/stub in layout path. |

### Tests run (loop 8)

**Command:**

```bash
CI=true npx react-scripts test --watchAll=false --testPathPattern=DeckBuilder.unit.test
```

**Result:** 1 suite passed, **30 tests passed**, 0 failed (2026-09-01).

REQ-003+004 tests (3):

- `REQ-003+004: idle shows collapsed Edit rail, not full editor pane`
- `REQ-003+004: Edit expands editor beside list and hides rail`
- `REQ-003+004: Close editor collapses back to Edit rail`

REQ-001 regression (5), REQ-002 regression (6), and 16 baseline tests also passed in the same run.

## Global checks

| Check | Status | Notes |
| --- | --- | --- |
| No app-wide restyle | **pass** | Layout CSS scoped to deck workspace |
| No new long-lived Actions artifacts | not-run | Out of loop 8 scope |
| PR #12 not merged | **pass** | No merge performed |
| No open PR for epic work | **pass** | No open PR on branch |

## Run metadata

- **Loop:** 8 (QA)
- **Commit verified:** `83623d2` (branch `cursor/ralph-epic-001-plan-8243`)
- **Tester:** QA agent (loop 8)
