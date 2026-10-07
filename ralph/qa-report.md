# Feedback

## add-slide-chooser QA PASS

- REQ-007 / AC-007: Add SONG opens chooser with Pick from library (default) and Import a file; pick or import inserts one song slide; other slides remain (splice after selection).
- REQ-008: Picking a library song adds a new slide; does not replace the deck.
- REQ-010 / REQ-017 / AC-009 / AC-014: Import panel shows Also save to my library on the same screen, checked by default; POST /library/songs/save only when checked.
- Pam: empty library message points to Import or Add by hand.
- Optional `librarySongId` on Slide when picked/saved; existing slides without it remain valid.

### Regression (outside chooser)
- Top-level Load still builds a one-slide deck for song XML/JSON (existing behavior; not the add-slide path).
- Present two-line staging (`stagedSongSlide`) and presentDataContract tests green.
- DeckBuilder import-save prompt tests for Load path still green.

Independent: tsc exit 0; Jest 5 suites / 70 PASS.

Next selected: `library-search-pick`. Loops used: 9/24. Do not open a PR.
