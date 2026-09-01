# QA report — epic-001

| REQ | Description | Status | Notes |
| --- | --- | --- | --- |
| REQ-001 | Song finish → next deck slide | **pass** | Re-verified loop 14; 5 REQ-001 tests pass in 43-test epic suite. |
| REQ-002 | Showing row highlight | **pass** | Re-verified loop 14; 6 REQ-002 tests pass in 43-test epic suite. |
| REQ-003 | More workspace width | **pass** | Re-verified loop 14; 3 layout tests pass in 43-test epic suite. |
| REQ-004 | Collapsed Edit rail | **pass** | Re-verified loop 14; 3 layout tests pass in 43-test epic suite. |
| REQ-005 | Prominent Save slide | **pass** | Re-verified loop 14; 3 Save slide tests pass in 43-test epic suite. |
| REQ-006 | Drag-and-drop reorder | **pass** | Re-verified loop 14; 4 DnD/reorder tests pass in 43-test epic suite. |
| REQ-007 | Export / Save toolbar + Home refresh | **pass** | Code + unit tests verified (loop 14). See evidence below. |
| REQ-008 | Unit tests REQ-001–007 + adjacent | **pass** | 43 epic tests + 10 adjacent (LibraryPanel, deck-to-presentation) pass; loop 14. |

## Epic validation checklist (loop 14 — final QA)

| Validation item | Result |
| --- | --- |
| REQ-001 last lyric → next slide; no song restart | **pass** |
| REQ-002 Showing background; single row; navigation updates; End clears | **pass** |
| REQ-003 more workspace width vs PR #12 side-by-side | **pass** |
| REQ-004 collapsed rail; Edit expands; Cancel/Save slide collapses | **pass** |
| REQ-005 prominent Save slide; persists edits | **pass** |
| REQ-006 no ↑/↓; DnD; Top/Move; Showing by id after reorder | **pass** |
| REQ-007 Export (file) + Save (library); Home in-place refresh | **pass** |
| REQ-008 unit tests REQ-001–007 + adjacent Deck/library | **pass** |
| No app-wide restyle | **pass** |
| PR #12 not merged by this work | **pass** |
| No open PR for epic branch | **pass** |

## REQ-001 evidence (loops 3, 5, 8, 10, 12, 14)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Last stage → next deck slide | **pass** | `handleSongStageAdvance`: `nextStage >= total` → `sendSlideAtIndex(currentIndex + 1)`. |
| Loop 14 regression | **pass** | All 5 REQ-001 unit tests pass (43/43 epic suite). |

## REQ-002 evidence (loops 5, 8, 10, 12, 14)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Showing row + label (identity-keyed) | **pass** | `getShowingSlideId()` + `.deck-slide-item--showing` + SHOWING label. |
| Showing after reorder | **pass** | Top reorder + drag reorder tests assert `data-slide-id` unchanged. |
| Loop 14 regression | **pass** | All 6 REQ-002 unit tests pass (43/43 epic suite). |

## REQ-003 + REQ-004 evidence (loops 8, 10, 12, 14)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Idle list width + collapsed Edit rail | **pass** | `App.css` idle `flex: 1`; rail when not expanded; 42% split only when expanded. |
| Edit expands / Close or Save slide collapses | **pass** | `isSlideEditorExpanded` gates panel vs rail; `collapseSlideEditor()` / `saveSlideEdits()`. |
| Loop 14 regression | **pass** | All 3 REQ-003+004 unit tests pass (43/43 epic suite). |

## REQ-005 evidence (loops 10, 12, 14)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Prominent Save slide; draft until commit | **pass** | `slideEditDraft`, `saveSlideEdits()`, header/footer Save slide buttons. |
| Loop 14 regression | **pass** | All 3 REQ-005 unit tests pass (43/43 epic suite). |

## REQ-006 evidence (loops 12, 14)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| No ↑/↓; drag handle; shared `reorderSlide` | **pass** | `deck-slide-drag-handle`; Top/Move/drop all call `reorderSlide`. |
| Showing by id after reorder | **pass** | `getShowingSlideId()` / `lastSentSlideId` vs `data-slide-id`. |
| Loop 14 regression | **pass** | 4 reorder tests pass (43/43 epic suite). |

## REQ-007 evidence (loop 14 — independent QA)

### Code review

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Toolbar **Export** (file download) | **pass** | `#export` L911, `handleExportClick` L799–813: Blob + `<a download>`. Message "No deck to export". |
| Toolbar **Save** (library persist) | **pass** | `#save` L912, `handleSaveToLibrary` L816–840: POST `/library/save`. No `#save-to-library` in toolbar. |
| Not old labels | **pass** | Grep: no toolbar "Save to Library"; REQ-007 test asserts `#save-to-library` absent. |
| Home list updates in place | **pass** | `notifyLibraryChanged()` L837 after save; `HomePage` `subscribeLibraryChanged` L25–26 → `libraryRefreshKey` → `LibraryPanel` `fetchEntries` on `refreshKey` change. |
| No full page reload | **pass** | Grep `libraryRefresh.ts`, `HomePage.tsx`, `LibraryPanel.tsx`: no `location.reload`. Home REQ-007 test asserts refetch via fetch count, not reload. |
| Does not steal Deck focus | **pass** | `notifyLibraryChanged` uses BroadcastChannel + localStorage only; no `window.focus` in save path. `handleOpenFromLibrary` opens deck without focus (L31–33). |
| Cross-window when Home separate | **pass** | `BroadcastChannel('poster-library')` + `storage` event on `poster-library-refresh-ts`. |
| Loop 14 REQ-001–006 regression | **pass** | All prior REQ tests pass in same 43-test run. |

### Tests run (loop 14)

**Command:**

```bash
CI=true npx react-scripts test --watchAll=false --testPathPattern='DeckBuilder.unit.test|HomePage.unit.test|libraryRefresh'
```

**Result:** 3 suites passed, **43 tests passed**, 0 failed (2026-09-01).

| Suite | Tests |
| --- | --- |
| DeckBuilder.unit.test.tsx | 38 |
| HomePage.unit.test.tsx | 3 |
| libraryRefresh.unit.test.ts | 2 |

REQ-007 tests (5):

- `REQ-007: toolbar uses Export for file and Save for library (not old labels)`
- `REQ-007: toolbar Save calls /library/save and notifies library listeners`
- `REQ-007: library save notification refreshes Home list in place without reload`
- `notifyLibraryChanged invokes same-tab subscribers without reload`
- `notifyLibraryChanged reaches subscribers on another BroadcastChannel instance`

## REQ-008 evidence (loop 14)

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Unit tests for REQ-001–007 | **pass** | 43 tests above; each REQ has scoped tests that fail on regression. |
| Adjacent Deck/presentation/library tests | **pass** | `LibraryPanel.unit.test.tsx` (8) + `deck-to-presentation.test.tsx` (1) — 10 passed loop 14. |
| Packaging/Electron | not-run | Out of epic unit-test scope per instructions. |

**Adjacent command (loop 14):**

```bash
CI=true npx react-scripts test --watchAll=false --testPathPattern='LibraryPanel.unit.test|deck-to-presentation'
```

**Result:** 2 suites passed, **10 tests passed**, 0 failed.

## Global checks

| Check | Status | Notes |
| --- | --- | --- |
| No app-wide restyle | **pass** | Changes scoped to deck workspace, toolbar labels, library refresh |
| Toolbar Export + Save (REQ-007) | **pass** | Verified loop 14 |
| PR #12 not merged | **pass** | No merge performed |
| No open PR for epic work | **pass** | No open PR on branch |

## Run metadata

- **Loop:** 14 (QA — final epic close)
- **Commit verified:** `456094f` (branch `cursor/ralph-epic-001-plan-8243`)
- **Tester:** QA agent (loop 14)
- **Epic status:** **COMPLETE** — all validation items pass
