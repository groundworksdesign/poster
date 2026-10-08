# Feedback

## LOOP 19 DEV — fix-iris-regate-followups

`<status>pending</status>`

Iris re-gate on bc4320e (18 ACs PASS) found follow-ups; MUST-FIX apply-decks flake before final gate.

### DEV

- `UpdateDecksPrompt`: selection via useState initializer only; parent remounts with `key` (no effect reset).
- `SongLibraryPage.unit.test`: wait for checkbox checked + Apply label before click.
- Moved `routes/*.server.ts` → `src/adapters/remix/server/`; route ids / `?_data` unchanged.
- Prod e2e: `/library/loader/server` → 404.

`passes` false. `completeEpic` false. 45f10ff CI noted/ignored. No merge.


## LOOP 18 FINAL QA — add-slide-song-scratch-or-linked + epic

`<status>PASS</status>`

### AC-019 (six items)

1. Kind picker: Song from scratch / Linked song — PASS (prod e2e + spot)
2. Scratch excluded from linked-update / apply-decks; library edit leaves scratch alone — PASS (unit + seed unused decks)
3. Save to library via shared ImportReviewScreen; cancel keeps scratch; confirm sets librarySongId — PASS (prod spot)
4. Prod song-library e2e: scratch; linked insert; Save → title-match → linked — PASS (4/4)
5. Unit before/after link exclusion — PASS (`linkedSongUpdate.test.ts`)
6. Present/ + `stagedSongSlide.ts` byte-identical to main — PASS (0 diff bytes)

### Gate suite

| Check | Result |
| --- | --- |
| `tsc --noEmit` | 0 |
| Jest | 59 / 375 PASS |
| `build:remix` | 0 |
| `test:e2e:remix` | 52 + 4 = 56 PASS |
| Electron e2e (xvfb + `ELECTRON_DISABLE_SANDBOX`) | 12 PASS |
| Open agent PRs | #26 only (#27 closed) |

`completeEpic` true. All todos `passes: true`. No merge.

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
