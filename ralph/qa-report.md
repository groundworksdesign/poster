# Feedback

## empty-library-schema QA PASS

- AC-001 / REQ-001: Fresh `initSchema` leaves `songs` with zero rows; `listSongsWithDb` returns `[]`; JSON fallback `jsonLibraryListSongs()` returns `[]` when file absent.
- Storage shape: columns `id`, `title`, `book`, `number`, `author`, `song_json` (lyrics); legacy tables migrate via ALTER; upsert keeps stable id and round-trips title/book/number/lyrics.
- Wiring: `songs.server` list/get/upsert + `GET /library/songs` thin loader over `listSongs()`; no INSERT/seed on schema init.
- Bundling: no church-book / hymn-scrape dumps under `public`, `src`, packaging trees. `public/sample-song*.xml` are small single-song import demos, not library seed.
- Independent validation: `tsc --noEmit` exit 0; Jest 3 suites / 18 tests PASS.

Next selected: `add-song-by-hand`. Do not open a PR.
