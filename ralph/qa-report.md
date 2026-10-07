# Feedback

## fix-add-slide-import-review DEV (fix loop 6)

Chooser import goes through shared review screen. `passes:false`.

### Changes

- `ImportReviewScreen` shared by library import + AddSongSlideChooser
- Chooser: no-lyrics / title-match / keep_both; Also-save POSTs `/library/songs/import`
- DeckBuilder inserts one or many slides after selection (AC-007)
- Unit tests + prod e2e for duplicate title + no-lyrics

### Validation

- tsc 0; AddSongSlideChooser/ImportSongsReview/DeckBuilder unit PASS
- `test:e2e:remix:song-library` 3 passed
