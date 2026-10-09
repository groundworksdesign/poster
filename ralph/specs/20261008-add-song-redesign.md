# Add song slide: redesign inside the slide edit panel
- **Author:** Pam (UX) · **Date:** 2026-10-08 · **Status:** Approved by Roy (2026-10-08). Binding for epic-004 redesign pass.
- **Reviewed:** PR #26, branch `cursor/epic-004-song-library`, head `a6ebb77`
- **Mockup:** `20261008-add-song-redesign-mockup.html` (+ PNG when available)
- **Already decided by Roy:** (1) Add slide sits just below the Slides header. (2) The choice between "Song from scratch" and "Linked song from the library" happens inside the slide edit panel, not in a separate box.

## Roy decisions (supersede mockup/spec where they differ)

1. **"Also save to my library"** starts **UNCHECKED** for Song from scratch and **CHECKED** for imports.
2. Same-title search results show the **FULL first verse**, not two lines (and not a single first line).
3. Loading a song file from the toolbar (`handleUploadClick`) **ADDS a song slide** and no longer replaces the open deck.
4. A new slide joins the deck **only on Save slide**; Cancel leaves nothing behind.
5. **Ctrl/Cmd+Enter** on a search result stops on the song card first and **never** saves in one keystroke.

## 1. What's wrong today (file references)
1. **The song boxes open in the wrong place.** Add slide > SONG opens `AddSongSlideKindPicker` and then `AddSongSlideChooser`. Both render at the top of the page under the "Deck" heading (`DeckBuilder.tsx` lines 1066-1081), far from the slide list and the edit panel, and the edit panel may still be showing a different slide.
2. **Too many steps for linked songs.** It takes four steps: pick SONG in a dropdown, click Add Slide, click "Linked song", then pick from the library. After that the song goes straight into the deck with no preview (`AddSongSlideChooser.tsx` 145-170, `LibrarySongPicker.tsx` 68-93).
3. **Add slide is a dropdown plus a button in the file toolbar.** It sits next to Load/Export/Save/New Deck/Start Song (`DeckBuilder.tsx` 1088-1103). The dropdown defaults to GENERAL and has no effect until you click a separate button.
4. **Scratch songs are edited as raw JSON.** The song editor is a "Lyrics (JSON)" text box with "Apply Lyrics JSON" and "Add Verse" buttons (`DeckBuilder.tsx` 1455-1481). It has no Book or Number fields, so a scratch song saved to the library always has no book or number (`SaveScratchSongToLibrary.tsx` 26-31). Title is entered twice: once as the slide title, once inside the JSON.
5. **Save to library on a scratch slide is a button that opens another screen.** That screen has its own Cancel and confirm (`SaveScratchSongToLibrary.tsx` 131-178), separate from Save slide. Roy wants an "Also save to my library" checkbox that starts checked.
6. **Linked slides show a raw ID.** You see "Linked to library: 3f2c9a…", not the song's title, book, and number. There's no way to change the song or unlink it (`DeckBuilder.tsx` 1482-1485).
7. **Esc and focus don't work.** Neither song box handles Esc. Nothing gets focus when the kind picker opens. Focus is never returned to the slide list afterward. Each box has its own Cancel button at the bottom.
8. **Arrow keys can control the live show.** The page-wide shortcut handler only ignores keys typed into input, textarea, and select fields (`DeckBuilder.tsx` 128-147). If focus is on a song row button in the picker, arrow keys can also move the Present output. Keys pressed inside the edit panel should never reach Present.
9. **Leaving the deck.** "Open song library" and "Add by hand" are plain links that navigate away from the deck page (`AddSongSlideChooser.tsx` 228-232, `LibrarySongPicker.tsx` 151-153), which risks losing unsaved deck work.
10. **Two Save slide buttons** (header and footer, `DeckBuilder.tsx` 1419-1426 and 1596-1603), and the editor scrolls inside a fixed-height box.
11. **The word "library" means two things.** The deck Save button and the "Save this import to the library?" prompt (`DeckBuilder.tsx` 1622-1628) refer to the deck library. The song library is a different thing with the same name.

**Conflicts with Roy's decisions:**
- **Load still replaces the deck.** Loading a song XML or song JSON file with the toolbar Load button still replaces the whole open deck with a one-slide deck (`DeckBuilder.tsx` 165-307, `handleUploadClick`). That goes against REQ-008 and the brief's out-of-scope line "Replacing the open deck with a song."
- **First verse vs. first line.** When titles match, the picker shows only the first *line* (`domain/librarySongPicker.ts` `firstVerseLine`), but REQ-014 says *first verse*.

## 2. Layout
**Slide list (left)**
- Header row: **Slides**
- Directly under it: **[+ Add slide]**. Click opens a small menu: Song · Title · General · Image. Song is first.
- The new slide shows in the list right after the selected slide (or at the end) as a highlighted row named "New song slide (not saved)". It is not added to the deck until Save slide.

**Slide edit panel (right), top to bottom**
1. Header: "New song slide" or "Editing slide 4", then a Close (×) button.
2. **Song type**, two cards side by side: **Linked song from the library** and **Song from scratch**. After you choose one, the cards shrink to a one-line switch with the same two options, so you can change your mind.
3. **Body for the chosen type** (states below).
4. Style section (unchanged, collapsed by default for song slides).
5. **Footer, pinned to the bottom of the panel:** Delete / Duplicate on the left. **Cancel** and **Save slide (Ctrl+Enter)** on the right. One Save button only.

## 3. States

**A. New song slide, type not chosen.** Shows the two cards and a short line: "Linked songs update when the library song changes. Scratch songs live only in this deck unless you save them." Save slide is disabled.

**B. Linked song: empty library.** "Your song library is empty." Three buttons: **Import a song file**, **Type a new song** (switches to Song from scratch with Also save checked), and **Open song library**.

**C. Linked song: searching.**
- One search box: "Search title, book, number, or words".
- Optional Book filter next to it, shown only when the library has more than one book.
- Results list below it, up to about 8 rows visible. Each row shows **Title**, then Book · No.
- If the match came from the lyrics, the matching line shows in grey.
- Below the list, a link: "Import a song file instead."
- No matches: "No songs match 'xyz'." with two buttons: Import a song file, Type a new song.

**D. Linked song: duplicate titles.** When two or more results share a title, they're grouped under the title. Each one shows book · number and its **full first verse** in grey, so you can tell them apart.

**E. Linked song: song chosen.**
- The search area is replaced by a song card: title, book · number, a "Linked to library" badge, and the first four lines.
- Buttons on the card: **Change song** (back to search with the last query), **Unlink (make a copy)** (turns it into a scratch slide with the same words), and **Edit in library** (opens the library in its own window).
- Save slide is enabled.

**F. Song from scratch: editor.**
- Fields: Title (required), Book, Number, and Words.
- Words is a big plain text box: one line per lyric line, a blank line starts a new verse. Same rule as the library's Add song page, with no JSON.
- Under Words: a hint: "Shows two lines at a time in Present."
- **[ ] Also save to my library**, **unchecked** by default for scratch (Roy). With it checked, Save slide also adds the song to the library and links this slide to it.
- Problems show inline above the footer only when they apply, using the same choices as the import review:
  - Title already in the library: shows both songs' number and first lines, with **Keep both** (default), **Replace**, or **Don't save to library**.
  - No words: **Save title only** or **Don't save to library**.

**G. Import a file (from B or C).**
- Opens the system file picker.
- One clean song: it fills state E (linked), or state F if Also save is unchecked.
- A file with several songs or any problems: the shared import review shows *inside the panel*, with all songs checked, the No-lyrics and Title-match sections only when needed, and **Also save to my library** checked at the top.
- The confirm button reads "Add 3 song slides".
- If Also save is unchecked, the slides come in as scratch songs (not linked).

**H. Saving.** Save slide shows "Saving…" and the footer is disabled. Then the panel closes, the new row in the list is selected, and a status line confirms what happened, e.g. "Added 'How Great Thou Art' (Hymns 86), linked to library."

**I. Linked slide edited by hand.**
- On an existing linked slide, the words are shown read-only, with an **Edit words on this slide** button.
- Once the words differ from the library, a yellow note shows: "These words were changed on this slide. Library updates will ask before replacing them."
- The note has a **Use library words** button.

## 4. Default focus
| State | Focus lands on |
|---|---|
| A. Type choice | "Linked song" card if the library has songs; "Song from scratch" if it's empty |
| B. Empty library | Import a song file |
| C/D. Search | Search box (first result highlighted once results appear) |
| E. Song chosen | Save slide |
| F. Scratch editor | Title |
| G. Import review | The confirm button |
| After Save or Cancel | The slide's row in the list (or Add slide if the new slide was cancelled) |

## 5. Keyboard
- **Add slide:** press Enter or Space to open the menu, then S / T / G / I or the arrow keys plus Enter.
- **Type cards:** Left/Right arrows to move, Enter to choose. Pressing 1 picks Linked and 2 picks Scratch.
- **Search:** start typing; focus stays in the box.
  - ↑/↓ moves the highlight through results (and across duplicate groups).
  - **Enter** picks the highlighted song (state E).
  - **Ctrl/Cmd+Enter** on a search result also picks only (state E) — never saves in one keystroke (Roy). In the panel after a song is chosen / scratch editor, Ctrl/Cmd+Enter = Save slide.
  - Double-click on a row picks the song (state E), same as Enter.
- **Esc** backs out one level at a time:
  1. Clears the search text.
  2. Goes back to the type choice.
  3. Cancels the new slide.

  On an existing slide, Esc closes the panel and asks first if there are unsaved changes.
- **Tab order:** type switch → body fields, top to bottom → Also save checkbox → Cancel → Save slide.
- **Ctrl/Cmd+Enter** anywhere in the panel = Save slide.
- **While focus is anywhere inside the edit panel, arrow keys and Page Up/Down never move the Present output.**

## 6. What gets removed or changed
- **Removed:**
  - The "Add slide:" dropdown and "Add Slide" button in the top toolbar.
  - `AddSongSlideKindPicker` and `AddSongSlideChooser` as separate boxes at the top of the page. Their parts move into the panel: `LibrarySongPicker` and `ImportReviewScreen` are reused.
  - The Pick/Import radio buttons.
  - The "Lyrics (JSON)" box, "Apply Lyrics JSON", and the separate "Save to library" button and screen for scratch slides.
  - The raw library ID text.
  - The duplicate header Save slide button.
- **Changed:** Library links open the song library in its own window, so the deck stays open. The plain-text Words box becomes the song editor for every song slide. The JSON view can stay behind an "Advanced" toggle if Manny needs it.
- **Unchanged:** Present (title stage, then two lines at a time). Slide row Send / Advance / Reverse controls. The library page, its import review, and the update-decks prompt.

## 7. Questions only Roy can answer — RESOLVED

1. **Also save on scratch:** unchecked for scratch; checked for imports.
2. **Full first verse** when titles match.
3. **Load button** adds a song slide (does not replace the open deck).
4. **New slide timing:** joins deck only on Save slide; Cancel leaves nothing.
5. **Ctrl/Cmd+Enter on search:** pause on song card; never save in one keystroke.
