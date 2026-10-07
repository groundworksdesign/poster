# Feedback

## library-search-pick QA PASS

- AC-008 / REQ-009: Search by title, book, and number returns matches (`GET /library/songs?q=` + `findSongs` / `findSongsWithDb`).
- AC-016 / REQ-020: Lyric phrase search finds the song (substring over verse lines).
- AC-012 / REQ-014: Shared titles show first verse line inline in results (`shouldShowFirstVerse` / `firstVerseLine`).
- REQ-015 / AC-013 (link): Pick sets `librarySongId` on the new slide (REQ-016 hand-edit ask deferred to `linked-update-decks`).
- Insert-after-current / no deck replace: `insertSongSlideChoice` splices at `selectedSlideIndex + 1`; AC-007 unit keeps other slides.
- Pam: Enter or double-click; rows show title, book, number.
- Optional book filter: **not invented** — Pam UX review explicitly requires "plus an optional book filter" (binding with brief). Brief itself has no book-filter REQ; Pam is listed in `sourceArtifacts`.

Independent evidence: `tsc --noEmit` exit 0; Jest 5 suites / 37 PASS (librarySongPicker, LibrarySongPicker, AddSongSlideChooser, DeckBuilder.unit, songs.server). Product tip: `6c497798b9620d8fbbf6ac6af3f3cf483802ea20`.

Next selected: `library-page`. Loops used: 11/24. Do not open a PR.
