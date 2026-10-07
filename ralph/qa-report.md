# Feedback

## add-song-by-hand QA PASS

- AC-002 / REQ-002: Hand-add form at `/library/songs/add` saves title, book, number, verses via `POST /library/songs/save`; song appears in library and is findable via `GET /library/songs?q=` / Find UI.
- Persistence: `upsertSong` + `findSongs` (SQLite and JSON); `parseVersesText` blank-line verses.
- Reachability: Home "Add a song" link; CRA + Remix routes wired.
- Independent validation: `tsc --noEmit` exit 0; Jest 5 suites / 27 tests PASS.
- Status integrity: `empty-library-schema.passes` remains `true` (loop-3 QA verdict; QA owns `passes`). This commit sets loop=5, persona=qa, add-song-by-hand passes=true, selected=import-review-screen.

Next selected: `import-review-screen`. Loops used: 5/24. Do not open a PR.
