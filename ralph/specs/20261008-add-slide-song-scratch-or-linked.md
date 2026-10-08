# Decision — Add slide > SONG: scratch vs linked

- **Date:** 2026-10-08
- **Decided by:** Roy
- **Epic / branch:** epic-004 / `cursor/epic-004-song-library`
- **PR:** https://github.com/groundworksdesign/poster/pull/26 (no new PRs; do not merge)
- **Budget:** Ralph loops 16–19 (planning → dev → QA; one task/loop; only QA sets `passes`)

## Decision

**Add slide > SONG** offers two slide types:

1. **Song from scratch** — the old blank song slide, created in place. Not linked to the library (`librarySongId` absent/null). No chooser.
2. **Linked song** — today’s `AddSongSlideChooser` (pick from the library, or import through the review screen with Also save). Keeps `librarySongId`.

## Constraints

- Scratch slides must **never** appear in the linked-update prompt or the deck-update (`apply-decks`) prompt.
- Scratch slides must **never** be changed by a library edit.
- `src/presentation/Present/` and `src/domain/stagedSongSlide.ts` stay byte-identical to `main`.
- Intermediate commits use `[skip ci]`; commit only on this branch.

## Validation required

- Real-app prod-build e2e (`playwright.remix.song-library` config):
  - Scratch path creates an editable blank song slide in place with no chooser.
  - Linked path inserts from the library (chooser).
- Unit test: a library edit leaves scratch slides alone and excludes them from the prompts.

## Task

`add-slide-song-scratch-or-linked` — implement the two-type Add-slide > SONG split and the tests above.
