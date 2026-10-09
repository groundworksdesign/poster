# Epic-004 song library — AC-001..AC-018 traceability

Maps each acceptance criterion to real tests (file + case name). Updated loop 18 (`tests-song-library`).

| AC | Requirement | Primary tests |
| --- | --- | --- |
| AC-001 | REQ-001 Fresh install has zero library songs | `src/adapters/persistence/songs.server.test.ts` — `lists zero songs on a fresh schema (AC-001 / REQ-001)`; `src/adapters/persistence/schema.server.test.ts` — `fresh songs table has zero rows (AC-001)`; `src/__tests__/library-json.server.test.ts` — `lists zero songs on a fresh JSON library (AC-001)` |
| AC-002 | REQ-002 Hand-added song is findable later | `src/presentation/SongLibrary/AddSongByHand.unit.test.tsx` — `posts one song and finds it afterward`; `src/adapters/persistence/songs.server.test.ts` — `AC-002 / AC-008 / AC-016: finds by title, by book, by number, and by lyric phrase each`; `src/__tests__/library-json.server.test.ts` — `finds a hand-added song later (AC-002)` |
| AC-003 | REQ-003 Import gathered JSON + Poster song XML/JSON | `src/domain/songImport.test.ts` — `AC-003: parses gathered book JSON and Poster song JSON`; `AC-003: parses Poster song XML` |
| AC-004 | REQ-004, 022 Multi-song waits for review checklist | `src/presentation/SongLibrary/ImportSongsReview.unit.test.tsx` — `AC-004: multi-song shows review and does not import until confirm`; `src/domain/songImport.test.ts` — `AC-004 / AC-018: multi-song needs review; clean file resolves in one confirm` |
| AC-005 | REQ-005, 018 No-lyrics offer title only or skip | `src/presentation/SongLibrary/ImportSongsReview.unit.test.tsx` — `AC-005: no-lyrics section appears and defaults to title only`; `src/domain/songImport.test.ts` — `AC-005 / AC-015: no-lyrics songs wait on group action (title only or skip)` |
| AC-006 | REQ-006, 019 Title match number/lyrics; keep both default | `src/presentation/SongLibrary/ImportSongsReview.unit.test.tsx` — `AC-006 / AC-015: title match section defaults to keep both`; `src/domain/songImport.test.ts` — `AC-006 / AC-015: title match shows number/lyrics; default keep both; replace and skip` |
| AC-007 | REQ-007, 008 Add song slide import or insert without replace | `src/presentation/Deck/DeckBuilder.unit.test.tsx` — `AC-007: add song slide from library inserts without replacing other slides`; `src/presentation/Deck/AddSongSlideChooser.unit.test.tsx` — chooser defaults / import / pick cases |
| AC-008 | REQ-009 Search by title, book, and number each | `src/adapters/persistence/songs.server.test.ts` — `AC-002 / AC-008 / AC-016: finds by title, by book, by number, and by lyric phrase each`; `src/presentation/Deck/LibrarySongPicker.unit.test.tsx` — `AC-008 / AC-016: searches via q= for title, book, number, and lyrics` |
| AC-009 | REQ-010 Import-while-adding saves only after yes | `src/presentation/Deck/AddSongSlideChooser.unit.test.tsx` — `AC-014: Also save checkbox defaults checked; AC-009: saves only when checked` |
| AC-010 | REQ-011, 012 Edit/delete available; decks after confirm | `src/presentation/SongLibrary/SongLibraryPage.unit.test.tsx` — `REQ-011: edit/delete`; `REQ-012/023: used song edit shows deck checkboxes`; `src/domain/linkedSongUpdate.test.ts` / `linkedSongDecks.server.test.ts` — apply only selected |
| AC-011 | REQ-013 Present title then two lyric lines | `src/domain/stagedSongSlide.test.ts` — core stages + `AC-011 / REQ-013 (library-linked + linked-update)` |
| AC-012 | REQ-014 Shared titles show first verse | `src/presentation/Deck/LibrarySongPicker.unit.test.tsx` — `AC-012: shared titles show first verse inline`; `src/domain/librarySongPicker.test.ts` — `shows first verse only when titles are duplicated` |
| AC-013 | REQ-015, 016 Linked updates; hand-edit extra yes | `src/domain/linkedSongUpdate.test.ts` — `AC-013` cases; `src/presentation/SongLibrary/UpdateDecksPrompt.unit.test.tsx` — `REQ-016: asks before overwriting hand-edited slides`; `LibrarySongPicker` — `REQ-015 / Enter: picks linked song with librarySongId` |
| AC-014 | REQ-017 Also save checkbox default + follows box | `src/presentation/Deck/AddSongSlideChooser.unit.test.tsx` — `AC-014: Also save checkbox defaults checked; AC-009: saves only when checked` |
| AC-015 | REQ-018, 019 Title-only empty lyrics; keep-both default | Covered with AC-005 / AC-006 tests above (`songImport.test.ts`, `ImportSongsReview.unit.test.tsx`) |
| AC-016 | REQ-020 Lyric phrase search | `songs.server.test.ts` — lyric phrase assertions in AC-008/016 case; `LibrarySongPicker.unit.test.tsx` — `AC-008 / AC-016` |
| AC-017 | REQ-021 Library from main menu and Add song slide | `src/presentation/HomePage.unit.test.tsx` — `AC-017 / REQ-021: Song library opens from main menu (Home)`; `src/presentation/Deck/AddSongSlideChooser.unit.test.tsx` — `AC-017: links to song library manage page`; `SongLibraryPage.unit.test.tsx` — `AC-017: page shows search, Add, Import, Edit, Delete` |
| AC-018 | REQ-022, 023 Clean multi-song one-click; problem sections when needed; unused edit/delete no deck prompt | `ImportSongsReview` — single clean skip review + multi-song without problem sections until needed; `songImport.test.ts` — `AC-004 / AC-018` + `AC-022`; `SongLibraryPage.unit.test.tsx` — `AC-018: unused song edit does not show deck prompt`; `AC-018 / REQ-023: unused song delete has no deck prompt` |

## Uncovered ACs

None for AC-001..AC-018 at unit/integration level. E2E for song-library UI is not required by the epic matrix; CI Remix/Electron e2e remain green for unrelated flows.

## CI commands (from `.github/workflows/pr.yml` unit-integration job)

```bash
pnpm exec tsc --noEmit
pnpm exec react-scripts test --watchAll=false --runInBand
```

No separate lint job in `pr.yml` (ESLint via `react-scripts` / `eslintConfig` only).
