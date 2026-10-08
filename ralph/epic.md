---
name: Song library
epic: epic-004
status: approved
source_artifacts:
  - id: 20261004-001
    title: Poster song library
    path: 20261004-feature-brief-song-library.md
overview: "Ship an empty local song library with add-by-hand, one-screen file import, search and pick onto a new linked slide, and library edit/delete that can update decks after the user confirms."
todos:
  - id: empty-library-schema
    content: "Wire the unused local songs table (or equivalent) so a fresh install has an empty library, store title, book, number, lyrics, and a stable song id, and do not bundle the three church books."
    status: completed
  - id: add-song-by-hand
    content: "Add a form to create one library song at a time (title, book, number, verses) so it appears in search afterward (REQ-002)."
    status: completed
  - id: import-review-screen
    content: "Import Doug's gathered JSON plus existing Poster song XML/JSON through one review screen: checklist of songs all checked by default, no-lyrics group (title only or skip), title-match rows showing number and lyrics with keep both (default) / replace / skip. Skip the review screen for a single clean song file (REQ-003–006, 018–019, 022)."
    status: completed
  - id: add-slide-chooser
    content: "When adding a song slide, offer Pick from library (default) and Import a file. Importing while adding a slide shows Also save to my library checked by default on the same screen. The chosen song becomes a new slide in the open deck and does not replace the deck (REQ-007, 008, 010, 017)."
    status: completed
  - id: add-slide-song-scratch-or-linked
    content: "Add slide > SONG offers two types: (1) Song from scratch — blank song slide in place, no librarySongId, no chooser; (2) Linked song — AddSongSlideChooser (pick/import + Also save) with librarySongId. Scratch has Save to library via ImportReviewScreen (title-match keep-both; no-lyrics; cancel keeps scratch; confirm sets librarySongId). Scratch never appears in linked-update/apply-decks until linked. Prod e2e: scratch, linked insert, scratch→Save→duplicate-title→linked. Unit: excluded before save, included after (REQ-024)."
    status: completed
  - id: library-search-pick
    content: "Library search matches title, book, number, and lyrics. Results show title, book, and number. Shared titles show the first verse inline. Enter or double-click inserts a linked slide after the current slide (REQ-009, 014, 015, 020)."
    status: completed
  - id: library-page
    content: "Add a library page reachable from the main menu and from Add song slide, with the same search list plus Add, Edit, Delete, Import, and a used-in-N-decks count (REQ-011, 021)."
    status: completed
  - id: linked-update-decks
    content: "Keep slides linked to their library song. On edit or delete, ask about updating decks only when the song is used, list those decks with checkboxes, and ask again before overwriting slides that were edited by hand. Deleting never removes slides unless the user selects those decks (REQ-012, 015, 016, 023)."
    status: completed
  - id: present-unchanged
    content: "Leave Present song staging as title then two lyric lines per stage. Do not change that layout in this epic (REQ-013)."
    status: completed
  - id: tests-song-library
    content: "Add tests covering AC-001 through AC-018: empty library, hand add, import formats and review defaults, pick-to-slide without replacing the deck, search including lyrics and first-verse for duplicate titles, save checkbox default, title-only empty lyrics, keep-both default, linked updates with hand-edit ask, and Present two-line staging still green."
    status: completed
isProject: false
---

# Epic 004: Song library

## Goal

Poster has a local song library that starts empty. Users add songs by hand or import files through one review screen, find songs by title, book, number, or lyrics, and add a linked song slide to the open deck. Editing or deleting a library song can update the decks that use it after the user confirms.

## Current Baseline

- Song slides and Present two-line staging already exist.
- Importing a song XML or song-shaped JSON today replaces the whole deck.
- A `songs` table exists in the local Poster database but is unused.
- Doug's gathered books live as import files only; they must not ship inside the app.

## Implementation Plan

1. Persist library songs with stable ids; ship empty.
2. Build the import review screen and parsers for gathered JSON plus existing song XML/JSON.
3. Build Add song slide chooser, library picker, and library page.
4. Store a library song id on slides added from the library; wire edit/delete update prompts.
5. Keep Present staging unchanged.
6. Cover AC-001–AC-018 with automated tests.

### Out of scope

- Bundling the three church books in the app
- Transcribing the five copyright-held songs
- Changing how Present stages a song slide
- Replacing the open deck with an imported song

## Data Flow

```mermaid
flowchart TD
  addSlide[Add song slide] --> kind{Scratch or Linked}
  kind -->|Scratch| blank[Blank song slide no librarySongId]
  blank -->|Save to library| saveReview[ImportReviewScreen]
  saveReview -->|confirm| linkedFromScratch[Slide gets librarySongId]
  saveReview -->|cancel| blank
  kind -->|Linked| choice{Pick or Import}
  choice -->|Pick| search[Search title book number lyrics]
  search --> slide[New linked slide in open deck]
  choice -->|Import| review[One review screen]
  review --> slide
  review --> library[(Song library)]
  linkedFromScratch --> library
  manage[Library page] --> library
  library -->|edit or delete with confirm| decks[Linked decks only]
```

## Primary Files Expected to Change

- Local DB / songs persistence and any migration from schema version 1
- Deck builder add-slide and song import paths (`DeckBuilder`, song parser)
- New library UI (picker, review screen, manage page)
- Slide / song types so a slide can hold a library song id
- Present path only as needed to keep existing staging green

## Validation

- [x] Fresh install has zero library songs (AC-001 / REQ-001)
- [x] Hand-added song is findable later (AC-002 / REQ-002)
- [x] Import accepts gathered book JSON and existing Poster song XML/JSON (AC-003 / REQ-003)
- [x] Multi-song file does not import until the review checklist is confirmed (AC-004 / REQ-004, 022)
- [x] No-lyrics songs offer title only or skip; nothing auto-imports (AC-005, AC-015 / REQ-005, 018)
- [x] Title match shows number and lyrics; default keep both; also replace and skip (AC-006, AC-015 / REQ-006, 019)
- [x] Add song slide can import or insert without replacing other slides (AC-007 / REQ-007, 008)
- [x] Search by title, book, number, and lyrics works; shared titles can show first verse (AC-008, AC-012, AC-016 / REQ-009, 014, 020)
- [x] Also save to my library starts checked and only saves when checked (AC-009, AC-014 / REQ-010, 017)
- [x] Edit/delete available; decks update only after confirm; hand-edited slides need an extra yes (AC-010, AC-013, AC-018 / REQ-011, 012, 015, 016, 023)
- [x] Present still title then two lines (AC-011 / REQ-013)
- [x] Library opens from main menu and Add song slide (AC-017 / REQ-021)
- [x] Add slide > SONG offers scratch (blank, unlinked) and linked (chooser); scratch Save to library via ImportReviewScreen; scratch excluded from update prompts until linked (AC-019 / REQ-024)

## Risks to manage

- Same title must not force overwrite; keep both is the default.
- Do not fill empty copyright songs by scanning or transcription.
- Existing decks without library links must keep working; only newly linked slides participate in updates.
