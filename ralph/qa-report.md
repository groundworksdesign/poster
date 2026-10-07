# Feedback

## library-page QA PASS

- AC-017 / REQ-021: Library opens from app main menu (Layout nav `nav-song-library` + Home `song-library-link`) and from Add song slide (`add-song-open-library`).
- REQ-011 / AC-010 (edit/delete available): Edit form posts to `/library/songs/save` with id; Delete posts to `/library/songs/delete/:id`.
- Search parity with picker: same `GET /library/songs?q=` (`findSongs`) plus shared book filter / first-verse helpers; manage page adds `usage=1` only for counts.
- used-in-N-decks: `countUsageBySongId` counts each presentation once; rows show "Used in N deck(s)".
- REQ-016 safety until `linked-update-decks`: delete removes library song only (`DELETE FROM songs` / JSON songs filter). Presentations and slide payloads are not modified or removed. Deck-update confirm UI deferred.

Independent evidence: `tsc --noEmit` exit 0; Jest 8 suites / 38 PASS. Product tip: `6352436eb862668755e41dea3fefdf7df8acbde0`.

Next selected: `linked-update-decks`. Loops used: 13/24. Do not open a PR.
