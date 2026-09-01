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
| Song staged advance (title → lyric pairs → blank → next slide) | Done | `handleSongStageAdvance` advances to `sendSlideAtIndex(current + 1)` at terminal stage; REQ-001 tests |
| `presentSlideIndex` tracking | Partial | State exists; **not surfaced as Showing UI** |
| Toolbar Save (file) + Save to Library | Partial | Wrong labels vs mock (REQ-007) |
| macOS Dock reopen, PR prereleases | Done | PR #12 scope (electron / CI) |

## Completed (this epic)

| REQ | Status | Evidence |
| --- | --- | --- |
| REQ-001 | **Done** | `handleSongStageAdvance`: `nextStage >= total` → next deck slide; no wrap on last deck slide. Tests: `DeckBuilder.unit.test.tsx` REQ-001 suite (5 tests). |

## Gaps (prioritized)

### 1. REQ-002 — Showing row highlight
**Gap:** No `SHOWING` label or teal row class. `presentSlideIndex` / `lastSentSlideId` exist but slide rows do not read them for styling.

### 2. REQ-007 — Export / Save toolbar + Home library refresh in place
**Gap:** Toolbar still `Save` (file) + `Save to Library`. `libraryRefreshKey` in `DeckBuilder` increments on save but Home `LibraryPanel` is a separate window/tab with no cross-window refresh (BroadcastChannel / `storage` event / `postMessage` not wired).

### 3. REQ-004 — Collapsed Edit rail
**Gap:** Idle state shows placeholder paragraph in a full-width editor column, not a narrow right-side “Edit” rail per mock.

### 4. REQ-003 — More workspace width
**Gap:** `.deck-slides-list` is `flex: 0 0 42%`; mock implies list + rail use most of the page width with editor collapsed by default.

### 5. REQ-005 — Prominent Save slide
**Gap:** Slide edits apply immediately via `updateSlideField` / `updateSlideStyle`; no primary “Save slide” control; mock expects explicit save that collapses editor.

### 6. REQ-006 — Drag-and-drop reorder
**Gap:** ↑/↓ buttons still present (`moveSlide`); no drag handles or DnD library.

### 7. REQ-008 — Unit test coverage for REQ-002–007
**Gap:** REQ-001 tests added; Showing, collapse, DnD, Export/Save rename, and Home in-place library update still untested.

---

## Selected next item

**REQ-002: Showing row highlight — live slide has distinct Showing background; only one row; Send/Start/Next/Previous/Go update it; End clears it.**

**Why this item:** REQ-001 unblocks live navigation; operators still cannot see which slide is on program without REQ-002. Next smallest UX increment aligned with the planning mock.
