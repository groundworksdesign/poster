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
| Song staged advance → next slide | Done | REQ-001 QA-pass |
| Showing row highlight (identity-keyed) | Done | REQ-002 QA-pass |
| macOS Dock reopen, PR prereleases | Done | PR #12 scope (electron / CI) |

## Completed (this epic)

| REQ | Status | Evidence |
| --- | --- | --- |
| REQ-001 | **Done (QA-pass)** | Song last stage → next deck slide; 5 unit tests |
| REQ-002 | **Done (QA-pass)** | `getShowingSlideId()` + `.deck-slide-item--showing` + SHOWING label; 6 unit tests |

## Gaps (prioritized — loop 6 codebase search)

### 1. REQ-003 + REQ-004 — Wider slides workspace + collapsed Edit rail (same layout change)
**Gap:** `.deck-slides-list` is fixed at `flex: 0 0 42%` (`App.css` L448–452). `.deck-slide-editor` always occupies `flex: 1` with a full placeholder paragraph when idle (`DeckBuilder.tsx` L1217). Mock shows slides using most of the width and a narrow vertical **Edit** rail on the right until a row’s Edit is clicked.
**Not implemented:** collapsed rail UI, width reclaim when idle, expand-on-Edit / collapse-on-Close editor.
**Tests:** none for rail or width.

### 2. REQ-005 — Prominent Save slide
**Gap:** Slide edits apply immediately via `updateSlideField` / `updateSlideStyle`; editor has **Close editor** but no primary **Save slide** button (`DeckBuilder.tsx` L1078–1207). REQ-004 spec expects Save slide to collapse editor — depends on REQ-004 rail being in place first.
**Tests:** none.

### 3. REQ-006 — Drag-and-drop reorder (keep Top / Move)
**Gap:** ↑/↓ buttons still on every row (`moveSlide`, L1049–1050). No drag handles, no `draggable`, no DnD library in `package.json`. Mock shows `::` handles and helper text “Drag the handle to reorder”.
**Partial:** `reorderSlide` + `adjustPresentIndexAfterReorder` exist; REQ-002 Showing follows id after Top reorder.
**Tests:** none for DnD.

### 4. REQ-007 — Export / Save toolbar + in-place Home library list
**Gap (labels):** Toolbar still `#save` → file download (`handleSaveClick`) and `#save-to-library` → library POST (`handleSaveToLibrary`). Mock: **Export** + **Save**. E2e specs target `#save-to-library` / `#import-save-to-library`.
**Gap (Home refresh):** `handleSaveToLibrary` increments `libraryRefreshKey` in `DeckBuilder` (L747) but that state is **never passed to any component** — dead code. Home `LibraryPanel` has its own `refreshKey` in `HomePage.tsx`; no cross-window BroadcastChannel / `storage` / `postMessage` wiring when Deck saves from a separate window.
**Tests:** library save e2e exist; no test for in-place Home refresh after Deck Save.

### 5. REQ-008 — Unit tests for REQ-003–007
**Gap:** REQ-001–002 covered (29 DeckBuilder tests). No tests yet for collapsed rail, width, Save slide, DnD, Export/Save rename, or Home in-place refresh.

---

## Selected next item

**REQ-003 + REQ-004: Wider slides workspace with collapsed Edit rail — idle state shows a narrow right “Edit” rail; Edit expands the panel; Close editor collapses back; slides list uses the reclaimed width.**

**Why this item:** Loop 6 search confirms both are the same layout/CSS/structure change (42% list + always-visible editor column vs mock’s full-width list + collapsed rail). Smallest high-impact increment after Showing; matches the planning mock; lower risk than REQ-007’s cross-window library sync or REQ-006’s new interaction surface. REQ-005 Save slide should follow once the rail expand/collapse exists.

**Do not implement in this item:** REQ-005 Save slide, REQ-006 DnD, REQ-007 toolbar rename / Home refresh.

---

## After selected item (remaining order)

1. REQ-005 — Prominent Save slide (collapse via rail)
2. REQ-006 — Drag-and-drop reorder; remove ↑/↓
3. REQ-007 — Export/Save toolbar labels + in-place Home library refresh
4. REQ-008 — Tests for each as they land
