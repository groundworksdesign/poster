---
name: Deck operator UX
epic: epic-001
status: approved
overview: "Make Poster Deck usable while presenting: song advance goes to the next slide, the live slide is visually marked, the editor uses more width and collapses when idle, slide save is obvious, reorder is drag-and-drop, toolbar Save/Export match their jobs, Home’s library list updates in place, and these behaviors have unit tests."
---

# Epic 001: Deck operator UX

## Goal
An operator can run a live show from Deck without fighting the UI: finishing a song advances to the next slide, the live slide is obvious in the list, the editor stays out of the way until needed, saving a slide and saving the deck are unambiguous, slides reorder by dragging, and Home’s library list updates as soon as the deck is saved. All of that is covered by unit tests.

- **REQ-001** After a song finishes, presentation advance goes to the next deck slide, not back to the start of that song.
- **REQ-002** The currently playing slide in the list has a distinct Showing background.
- **REQ-003** The deck edit area uses more of the page width.
- **REQ-004** The slide editor collapses to the side when nothing is being edited.
- **REQ-005** Saving a slide’s edits is more obvious (prominent Save in the slide editor).
- **REQ-006** Reorder slides with drag-and-drop instead of up/down arrows. Keep Top and Move-to-number.
- **REQ-007** Toolbar: current Save becomes Export (file). Current Save to Library becomes Save. Save updates the Home presentation list in place (no full page refresh).
- **REQ-008** Unit tests for these features, and comprehensive unit testing for the Deck / presentation / library code this work touches.

## Current Baseline
Work on top of PR #12 (cursor/deck-editor-ux-d46a), not a rewrite. Already present: Presentation bar Start/Previous/Next/jump/End; slides list left of editor; Top and Move-to-number; Home Open presentation in a new window; Start + green screen begins blank green; left/right arrows step slides and song lyric stages; macOS Dock reopen; PR prereleases without long-lived Actions artifacts.
Known bug this epic must fix: after the last lyric of a song, advance currently restarts that song instead of moving to the next deck slide.
Keep the current look of Poster. Do not restyle the whole app. Do not reintroduce Actions artifact bloat. Do not merge PR #12 as part of this epic.

## Implementation Plan (for planning, not for you to code)
1. Song advance (REQ-001): Next, right-arrow, and song Advance share one step-forward path. Last lyric → next deck slide. Mid-song still steps lyrics. Previous/Reverse/left-arrow inverse. End still blanks.
2. Showing highlight (REQ-002): keyed to slide identity, not a stale index. End may clear Showing.
3. Width and collapse (REQ-003, REQ-004): more width; idle editor is a collapsed side rail; Edit expands; Cancel or Save slide collapses.
4. Obvious slide save (REQ-005): primary Save slide in expanded editor. Not Export, not library Save.
5. Drag-and-drop (REQ-006): remove ↑/↓; keep Top and Move; same reorder function.
6. Export vs Save (REQ-007): Export = file; Save = library; Home list updates in place, no full page refresh.
7. Tests (REQ-008): existing runner; tests that fail on song-restart and on Home full-refresh; extend Deck/presentation/library tests touched by this work.

## Validation (QA will check these; planner must map each to current code)
- [ ] REQ-001 last lyric then Next/right-arrow/Advance show the following non-song slide; never restart that song; mid-song Advance still steps lyrics.
- [ ] REQ-002 live slide has Showing background; only one row; Send/Start/Next/Previous/Go update it; End blanks and does not leave stale Showing.
- [ ] REQ-003 workspace uses more page width than current PR #12 layout.
- [ ] REQ-004 no edit → collapsed rail; Edit expands; Cancel or Save slide collapses.
- [ ] REQ-005 prominent Save slide; persists that slide’s edits.
- [ ] REQ-006 no up/down arrows; drag-and-drop; Top and Move still work; Showing stays on same slide after reorder.
- [ ] REQ-007 toolbar Export (file) and Save (library); Save updates Home list in place.
- [ ] REQ-008 unit tests for REQ-001–007 pass; adjacent Deck/presentation/library tests; existing PR #12 tests still pass.
- [ ] No new long-lived Actions artifacts. No app-wide restyle. PR #12 not merged by this work.
