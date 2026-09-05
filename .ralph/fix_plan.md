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
| REQ-006 | **Done (QA-pass)** | Drag handles + HTML5 DnD via `reorderSlide`; ↑/↓ removed; Top/Move kept; 3 DnD tests |
| REQ-007 | **Done** | Toolbar Export/Save labels; `notifyLibraryChanged` cross-window; Home in-place refresh; 5 tests |

## Gaps (prioritized)

### 1. REQ-008 — Final test / QA sweep
**Gap:** REQ-001–007 unit tests in place (43 tests across DeckBuilder, HomePage, libraryRefresh). Remaining: final QA pass on full epic, adjacent integration/e2e if needed before merge.

---

## Selected next item

**Final QA — epic-001 close: verify REQ-001–007 in one QA loop; confirm no regressions; epic ready for PR when stakeholder approves.**

**Why this item:** All feature REQs implemented and unit-tested. REQ-008 acceptance for REQ-007 tests satisfied in loop 13.

**Do not implement in this item:** New features beyond epic scope.

---

## After selected item (remaining order)

1. Epic PR when stakeholder approves (PR #12 base + epic branch)
