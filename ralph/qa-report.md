# Feedback

## library-search-pick QA PASS

- AC-008 / REQ-009: Search by title, book, and number returns matches (`GET /library/songs?q=` + findSongs).
- AC-016 / REQ-020: Lyric phrase search finds the song.
- AC-012 / REQ-014: Shared titles show first verse line inline in results.
- REQ-015 / AC-013 (link): Pick sets `librarySongId` on the new slide (REQ-016 hand-edit ask deferred to linked-update-decks).
- AC-007 / insert-after-current: `insertSongSlideChoice` splices after `selectedSlideIndex`; other slides remain; no deck replace.
- Pam: Enter or double-click; rows show title, book, number.
- Optional book filter: **not invented** — Pam UX review explicitly requires "plus an optional book filter" (binding with brief).

Independent: tsc exit 0; Jest 5 suites / 37 PASS.

Next selected: `library-page`. Loops used: 11/24. Do not open a PR.
