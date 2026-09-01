# Fix plan — epic-001 (Deck operator UX)

Prioritized remaining work on top of PR #12 (`cursor/deck-editor-ux-d46a`). Highest priority first.

## Already present (baseline — do not regress)

| Area | Status | Evidence |
| --- | --- | --- |
| Presentation bar (Start / Previous / Next / Go / End) | Done | `DeckBuilder.tsx` `presentation-controls`; tests in `DeckBuilder.unit.test.tsx` |
| Slides list + editor workspace | Done | Collapsed Edit rail idle; expands on Edit; REQ-003+004 tests |
| Top + Move-to-number reorder | Done | `moveSlideToTop`, `moveSlideToNumber`; unit test |
| Home opens deck/presentation in new window | Done | `HomePage.tsx` `openAppWindow`; `HomePage.unit.test.tsx` |
| Green-screen Start sends blank | Done | `navigatePresentationStart`; unit test |
| Arrow keys step presentation / song stages | Done | `keyHandlerRef` in `DeckBuilder.tsx` |
| Song staged advance → next slide | Done | REQ-001 QA-pass |
| Showing row highlight (identity-keyed) | Done | REQ-002 QA-pass |
| macOS Dock reopen, PR prereleases | Done | PR #12 scope (electron / CI) |

## Completed (this epic)

| REQ | Status | Evidence |
| --- | --- | --- |
| REQ-001 | **Done (QA-pass)** | Song last stage → next deck slide; 5 unit tests |
| REQ-002 | **Done (QA-pass)** | `getShowingSlideId()` + `.deck-slide-item--showing` + SHOWING label; 6 unit tests |
| REQ-003 | **Done** | Idle `.deck-slides-list` flex 1; expanded row uses 42% list split; 3 layout tests |
| REQ-004 | **Done** | `deck-slide-editor-rail` when idle; `deck-slide-editor-panel` when Edit; `collapseSlideEditor()` |
| REQ-005 | **Done (QA-pass)** | Draft-based slide editor; prominent Save slide header/footer; `saveSlideEdits()` commits + collapses; 3 unit tests |
| REQ-006 | **Done** | Drag handles + HTML5 DnD via `reorderSlide`; ↑/↓ removed; Top/Move kept; 3 DnD tests |

## Gaps (prioritized)

### 1. REQ-007 — Export / Save toolbar + in-place Home library list
**Gap (labels):** Toolbar still `#save` (file) + `#save-to-library` (library). Mock: **Export** + **Save**. E2e specs use old ids.
**Gap (Home refresh):** `libraryRefreshKey` in DeckBuilder still unused; no cross-window refresh when Deck saves from separate window.
**Tests:** no in-place Home refresh test.

### 2. REQ-008 — Unit tests for REQ-005–007
**Gap:** REQ-001–006 covered (36 DeckBuilder tests). Export/Save rename, Home refresh still untested.

---

## Selected next item

**REQ-007: Export / Save toolbar labels + in-place Home library refresh — rename `#save` → Export (file), `#save-to-library` → Save (library); refresh Home library list when deck saved from separate window.**

**Why this item:** REQ-006 DnD is done; toolbar/library naming and cross-window refresh are the remaining UX gaps before REQ-008 test sweep.

**Do not implement in this item:** unrelated restyles or new features beyond REQ-007 scope.

---

## After selected item (remaining order)

1. REQ-008 — Tests for each as they land
