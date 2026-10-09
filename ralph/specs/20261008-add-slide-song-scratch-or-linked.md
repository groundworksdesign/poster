# Decision — Add slide > SONG: scratch vs linked

- **Date:** 2026-10-08
- **Decided by:** Roy
- **Epic / branch:** epic-004 / `cursor/epic-004-song-library`
- **PR:** https://github.com/groundworksdesign/poster/pull/26 (no new PRs; do not merge)
- **Budget:** Ralph loops 16–19 (planning → dev → QA; one task/loop; only QA sets `passes`)
- **Amended:** same day — scratch slides get **Save to library** via shared `ImportReviewScreen`

## Decision

**Add slide > SONG** offers two slide types:

1. **Song from scratch** — the old blank song slide, created in place. Not linked to the library (`librarySongId` absent/null). No chooser.
2. **Linked song** — today’s `AddSongSlideChooser` (pick from the library, or import through the review screen with Also save). Keeps `librarySongId`.

### Save to library (scratch → linked)

A Song-from-scratch slide needs a **Save to library** action. It runs the slide’s title and lyrics through the same shared `ImportReviewScreen`:

- Title-match with number plus first lyrics; keep-both default
- No-lyrics prompt (REQ-018 / 019 / 022)

**Cancel** → nothing is saved; the slide stays scratch.  
**Confirmed save** → the slide gets `librarySongId` and becomes a linked song slide, eligible for linked-update prompts from then on.

## Constraints

- Scratch slides (no `librarySongId`) must **never** appear in the linked-update prompt or the deck-update (`apply-decks`) prompt.
- Scratch slides must **never** be changed by a library edit.
- After Save to library succeeds, the slide is linked and **is** included in those prompts.
- `src/presentation/Present/` and `src/domain/stagedSongSlide.ts` stay byte-identical to `main`.
- Intermediate commits use `[skip ci]`; commit only on this branch.

## Validation required

- Real-app prod-build e2e (`playwright.remix.song-library` config):
  - Scratch path creates an editable blank song slide in place with no chooser.
  - Linked path inserts from the library (chooser).
  - Scratch → **Save to library** → duplicate-title prompt → saved → slide is now linked (`librarySongId` set).
- Unit tests:
  - Library edit leaves scratch slides alone and excludes them from the prompts.
  - Before saving, a scratch slide is excluded from the prompts; after saving it is included.

## Task

`add-slide-song-scratch-or-linked` — implement the two-type Add-slide > SONG split, Save to library on scratch, and the tests above.

## Acceptance (AC-019 / REQ-024)

1. Add slide > SONG offers **Song from scratch** (blank in place, no chooser, no `librarySongId`) and **Linked song** (`AddSongSlideChooser`).
2. Scratch slides never appear in linked-update / apply-decks prompts and are never changed by a library edit.
3. Scratch has **Save to library** via shared `ImportReviewScreen` (title-match keep-both default; no-lyrics prompt per REQ-018/019/022). Cancel keeps scratch; confirm sets `librarySongId` and the slide becomes linked.
4. Prod song-library e2e: scratch (no chooser); linked insert; scratch → Save to library → duplicate-title → saved → linked.
5. Unit: before save, scratch excluded from prompts; after save, included. Library edit leaves pre-save scratch alone.
6. Present/ and `stagedSongSlide.ts` remain byte-identical to `main`.
