# Fix plan — epic-001 (Deck operator UX)

Prioritized remaining work on top of PR #12 (`cursor/deck-editor-ux-d46a`). Highest priority first.

## Already present (baseline — do not regress)

| Area | Status | Evidence |
| --- | --- | --- |
| Presentation bar (Start / Previous / Next / Go / End) | Done | `DeckBuilder.tsx` `presentation-controls`; tests in `DeckBuilder.unit.test.tsx` |
| Slides list left of editor | Done | `.deck-slides-editor-row` flex layout; side-by-side test |
| Top + Move-to-number reorder | Done | `moveSlideToTop`, `moveSlideToNumber`; unit test |
| Home opens deck/presentation in new window | Done | `HomePage.tsx` `openAppWindow`; `HomePage.unit.test.tsx` |
| Green-screen Start sends blank | Done | `navigatePresentationStart`; unit test |
| Arrow keys step presentation / song stages | Done | `keyHandlerRef` in `DeckBuilder.tsx` |
| Song staged advance (title → lyric pairs → blank → next slide) | Done | `handleSongStageAdvance`; REQ-001 tests |
| Showing row highlight (identity-keyed) | Done | `getShowingSlideId()` + `.deck-slide-item--showing`; REQ-002 tests |
| Toolbar Save (file) + Save to Library | Partial | Wrong labels vs mock (REQ-007) |
| macOS Dock reopen, PR prereleases | Done | PR #12 scope (electron / CI) |

## Completed (this epic)

| REQ | Status | Evidence |
| --- | --- | --- |
| REQ-001 | **Done** | `handleSongStageAdvance`: `nextStage >= total` → next deck slide; no wrap on last deck slide. Tests: `DeckBuilder.unit.test.tsx` REQ-001 suite (5 tests). |
| REQ-002 | **Done** | `getShowingSlideId()` keys off `lastSentSlideId` when not blank; teal row + SHOWING label; cleared on End. Tests: REQ-002 suite (6 tests). |

## Gaps (prioritized)

### 1. REQ-007 — Export / Save toolbar + Home library refresh in place
**Gap:** Toolbar still `Save` (file) + `Save to Library`. `libraryRefreshKey` in `DeckBuilder` increments on save but Home `LibraryPanel` is a separate window/tab with no cross-window refresh (BroadcastChannel / `storage` event / `postMessage` not wired).

### 2. REQ-004 — Collapsed Edit rail
**Gap:** Idle state shows placeholder paragraph in a full-width editor column, not a narrow right-side “Edit” rail per mock.

### 3. REQ-003 — More workspace width
**Gap:** `.deck-slides-list` is `flex: 0 0 42%`; mock implies list + rail use most of the page width with editor collapsed by default.

### 4. REQ-005 — Prominent Save slide
**Gap:** Slide edits apply immediately via `updateSlideField` / `updateSlideStyle`; no primary “Save slide” control; mock expects explicit save that collapses editor.

### 5. REQ-006 — Drag-and-drop reorder
**Gap:** ↑/↓ buttons still present (`moveSlide`); no drag handles or DnD library.

### 6. REQ-008 — Unit test coverage for REQ-003–007
**Gap:** REQ-001–002 tests added; collapse, DnD, Export/Save rename, and Home in-place library update still untested.

---

## Selected next item

**REQ-007: Export / Save toolbar — rename Save → Export (file), Save to Library → Save; Save updates Home library list in place.**

**Why this item:** Operator save/export clarity is high-impact for workflow; follows mock toolbar. REQ-003–005 are layout/editor polish that can follow toolbar semantics.
