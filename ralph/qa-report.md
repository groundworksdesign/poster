# Feedback

## LOOP 17 DEV — add-slide-song-scratch-or-linked

`<status>pending</status>`

### Implemented

- Add slide > SONG → kind picker: **Song from scratch** (blank, no `librarySongId`, no chooser) / **Linked song** (`AddSongSlideChooser`).
- Scratch editor: **Save to library** via shared `ImportReviewScreen` (`SaveScratchSongToLibrary`); cancel keeps scratch; confirm sets `librarySongId`.
- Unit: scratch excluded from linked edit until linked; DeckBuilder scratch + Save paths.
- Prod e2e: scratch; Save → title-match → linked; linked insert.

`passes` left false for QA loops 18–19. `completeEpic` false. No merge.

## LOOP 16 PLANNING (amended) — add-slide-song-scratch-or-linked

`<status>pending</status>`

### Decision

Roy: Add slide > SONG offers **Song from scratch** and **Linked song**. Scratch has **Save to library** via shared `ImportReviewScreen` (title-match keep-both; no-lyrics). Cancel keeps scratch; confirm sets `librarySongId`. Scratch excluded from update prompts until linked.

Spec: `ralph/specs/20261008-add-slide-song-scratch-or-linked.md`

### Selected task

`add-slide-song-scratch-or-linked` (REQ-024 / AC-019)

### Budget

Loops 16–19 (planning amendment stays loop 16). `completeEpic` false. No merge.
