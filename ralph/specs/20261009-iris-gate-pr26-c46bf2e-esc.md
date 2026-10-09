# PR #26 delta re-gate: head c46bf2e

**Verdict: FAIL**: `c46bf2e655ef02f6586a157df4210568bc282258`

Gated by Grok Bot (executor for Jack/Iris/Race) on Oct 9 2026, 06:21–07:20 MT. Nothing was merged, approved, pushed, commented on or changed on GitHub; merging is not ours to do even on a PASS. The code came from the GitHub tarball (`git get-tar-commit-id` = c46bf2e6…; base tarball = 3a8ebd6c…). Nothing was cloned and no secrets were printed.

## Why it fails
**Polish item 2 (Esc order) fails, in both the prod build and the packaged AppImage.** Under the verdict rule, that is a FAIL on its own. Everything else passes: polish items 1, 3, 4 and 5, all 18 ACs, all 7 decisions, the blockers, regression, Present unchanged, existing decks and CI 11/11.

The two Esc defects (both reproduced on tip, packaged and a fresh-home tip rerun):

1. **One Esc does nothing after the search is cleared.** From search with text, the order is: Esc 1 clears the search ✓, **Esc 2 does nothing** (search empty, picker still shown), Esc 3 goes to the type choice, Esc 4 cancels. The spec says three presses: 1) clear, 2) type choice, 3) cancel.
   - **Cause (code):** `LibrarySongPicker` calls `markSearchEscConsumed()` and then `e.stopPropagation()`. In React 18 that also stops the native event, so the window keydown handler in `DeckBuilder` never sees that Esc and never consumes the flag. The stale flag then swallows the next Esc (`DeckBuilder.tsx` ~L155 `if (consumeSearchEscFlag()) return;`).
   - **Likely fix:** don't set the flag when calling stopPropagation (or drop the stopPropagation and let the window handler consume the flag).
   - The unit test misses this because it calls `escapeRef.current()` directly instead of dispatching a second keydown.
2. **On an existing song slide with unsaved edits, Esc closes the panel without asking and throws the edits away.**
   - Existing scratch song slide: words changed to "esc one CHANGED" (or " UNSAVED" typed in the Words box), then Esc → **no dialog**, panel closed. On reopening, the words are the old "esc one" / "probe one…".
   - The confirm only works for edits that already live in `slideEditDraft` (e.g. a general slide's Title: Esc → "Discard unsaved changes to this slide?"; decline keeps the change, accept discards it ✓; a clean slide closes with no dialog ✓).
   - **Cause (code):** `escapeExistingSlideEditor` compares `deck.slides[i]` with `slideEditDraft`. Song-panel edits (scratch words, hand-edit words) stay in `SongSlideEditPanel` local state until Save slide, so they never count as "dirty".
   - Spec L105: "On an existing slide, Esc closes the panel and asks first if there are unsaved changes."

## Head / base
- Head **c46bf2e655ef02f6586a157df4210568bc282258**. I read it at 06:21 MT and again at ~07:15 MT, and it did not move. I gated the requested head.
- State: open, not draft, not merged, mergeable true / **clean**. Size: 64 commits, +12065/−426, 105 files.
- **Base: main 3a8ebd6cd0cc45cf028ed57105b1bbe4b411abbc** (unchanged).
- The delta from 4737baa is 8 files:
  - `DeckBuilder.tsx`, `LibrarySongPicker.tsx` and `SongSlideEditPanel.tsx`;
  - the new `songPanelEsc.ts`;
  - 3 test files;
  - ralph docs.

## 1. Regression: PASS
| Check | Result |
|---|---|
| pnpm install --frozen-lockfile | exit 0 |
| tsc --noEmit | exit 0 |
| build:remix | exit 0 |
| Jest run 1 / run 2 | 63/63 suites, **421/421** tests both runs (was 418) |
| Remix e2e (dev + song-library) | **50 + 8 passed** |
| Electron e2e (xvfb) | **12 passed** |
| Flake `used song edit shows deck checkboxes` | isolated **10/10**, whole-file **10/10** |
| Harness tip-check | 45/45 |

**Polish 5, the three looser checks: all tightened again (PASS).** The diff vs 4737baa is in `evidence/test-diffs.txt`.
- **Scratch e2e:** `remix-song-library.spec` now reopens the song row and asserts `slide-library-song-id` == the new library id and ≠ the existing id.
- **DeckBuilder unit "scratch save → linked":** now reopens the slide and asserts `data-library-song-id` = `saved-scratch-1`.
- **`remix-song-library.spec` L219:** the `.or(song-linked-card)` is gone; it now requires `song-multi-import-ready` only.

**Deleted or weakened tests:**
- None deleted and none weakened.
- One test was rewritten to match the spec: the DeckBuilder "Library ID" test used to assert `Library ID: lib-123` and now asserts the text and testid are **absent** (spec §6).

**Added tests:** three `SongSlideEditPanel.unit` tests (State I current library words, Esc chain, type-card arrows).
- The Esc unit test calls `escapeRef.current()` directly for presses 2 and 3, so it cannot catch defect 1.

## Polish table (prod build = tip prod server; packaged = beta AppImage)
| # | Item | Tip | Packaged | Evidence |
|---|---|---|---|---|
| 1a | "Use library words" restores the **current** library words (library changed first) | **Pass** | **Pass** | Hand-edited slide saved ("HAND EDITED one/two"). Library then edited to "alpha CURRENT v2 a/b" (deck update skipped). Reopen → Use library words → card shows v2. Saved slide lyrics = v2 = library. |
| 1b | Note shows on open of an already hand-edited slide, before typing | **Pass** | **Pass** | `noteOnOpenBeforeTyping:1`; the editor opens unlocked with the hand-edited words. |
| 1c | After saving: linked, no longer hand-edited | **Pass** | **Pass** | Same library id. Synced fingerprint = slide = library. No note on reopen. The next library edit (v3) lists the deck with no "edited by hand" or "Not updated" status. |
| 2a | Esc: clear search → type choice → cancel (nothing left in deck or library) | **FAIL** | **FAIL** | It takes 4 presses: Esc 2 is dead (defect 1). After the 4th: panel gone, pending gone, rows unchanged, library Δ0. Scratch title Esc → type choice → cancel works (2 presses, Δ0). On the card, Esc goes back one level and then out; Δ0. |
| 2b | Existing slide with unsaved changes: confirm first; decline keeps, accept discards | **FAIL** | **FAIL** | General slide Title: confirm shown; decline keeps "Key Slide 2 CHANGED"; accept discards ✓. **Song slide words: no confirm, edits lost** (defect 2). Clean slide: closes with no dialog ✓. |
| 3a | Type cards: Left/Right only move focus | **Pass** | **Pass** | Focus starts on linked. → focuses scratch with the choice still shown; ← goes back; Enter/Space pick; 1/2 pick. |
| 3b | Add slide menu takes focus; arrows work | **Pass** | **Pass** | Enter or Space opens it with focus on `add-slide-song`. ↓ title, ↓ general, ↑ title. Enter on General adds a slide. S key works. |
| 3c | Default focus: E = Save slide; B = Import a song file; empty-library type choice = Scratch | **Pass** | **Pass** | `focusE: save-slide-button`. empty-lib (fresh homes): `typeChoiceFocus: song-type-scratch`, `focus: add-song-go-import` on tip and packaged. Also checked: F = Title, C = search. |
| 4 | Raw "Library ID" text gone | **Pass** | **Pass** | No "Library ID" text, no `library-id` testid and no visible UUID on /deck (opened and after save), / and /library/songs. Save message: "Library updated." |
| 5 | Three looser checks tightened; weakened or deleted tests listed | **Pass** | n/a | §1 |

## 2. AC matrix (tip prod server AND packaged AppImage): 18 Pass / 0 Fail / 0 Not-run
acceptance.mjs: **21/0 tip, 21/0 packaged**, with 0 page errors and 0 console errors. Results are the same as the 4737baa gate (see next-4737baa/GATE.md §2 for per-AC evidence):
- AC-001–010: Pass
- AC-011: Pass (static + unit; Present byte-identical)
- AC-012–018: Pass
- Real Children's Songbook in the packaged app: 268 in the checklist, 0 imported before confirm, then 268 imported.
- scratch.mjs: 17/0 on tip and packaged (both SONG types; scratch never prompts; scratch → review → linked for new and existing slides; old `*.server` URLs 404).

## 2b. Old blocker scenarios (blockers.mjs **9/0 tip, 9/0 packaged**; scratch ITEM-5 17/0 on both)
| Scenario | Tip | Packaged |
|---|---|---|
| Library writes only on Save slide (single file, keep both / replace / skip, no-words + title match) | Pass | Pass |
| Cancel leaves nothing (multi review; single file Cancel / ✕ / Esc / leaving the page; scratch review new and existing; multi-import on an existing slide) | Pass | Pass |
| Existing-scratch review keeps edits (panel open, words kept, Δ0 with review open) | Pass | Pass |
| Multi-import on an existing slide + Save slide (replaced plus inserted, both linked, +2) | Pass | Pass |

## 3. Roy's 7 decisions: 7/7 Pass
redesign.mjs D1–D7 pass on tip and packaged; the only failing step is POLISH-2.

| # | Grade | Notes |
|---|---|---|
| 1 Add slide under the Slides header, whole flow in the panel, no modal | Pass | |
| 2 Also save: unchecked for scratch, checked for imports | Pass | |
| 3 Same-title songs show the full first verse (picker + manage page) | Pass | |
| 4 Toolbar song-file Load adds a slide and keeps the deck | Pass | |
| 5 A new slide joins only on Save slide; Cancel leaves nothing | Pass | |
| 6 Ctrl/Cmd+Enter on a result stops on the card | Pass | |
| 7 Arrow/Page keys never move Present with focus in the panel or list | Pass, **no regression** | Real Present popup on tip and packaged. **Electron packaged with a real Present BrowserWindow** (CDP `/json/list` shows the `/presentation?sessionId=…` page target): list Edit, row-text click, list background, panel Cancel, panel background, type card, search and Words all gave `moved:false` ×8; sanity check moved; result PASS. UA poster/0.1.18 Electron/40.10.0. |

## 4. Spec diffs (remaining, non-blocking)
- **S3 / Esc:** see the FAIL above.
  - Also: in the esc-probe, where the previous slide was still selected, cancelling the pending slide re-opened the editor on that previously selected slide instead of closing the panel. Minor.
- **S6** search area, **S7** footer and **S8** row Send focus are unchanged from 4737baa (see the 4737baa GATE §4).
- S1, S2, S4 and S5 are fixed (polish 3 and 4).
- The status line still reads "New song slide (not saved) — choose a type, then Save slide" after a song is chosen. Not re-checked in detail.

## 5. Theme persists: PASS
- I set dracula over CDP in the packaged app, which wrote `theme.json {"theme":"dracula"}`.
- After a kill and relaunch with the same HOME, home showed select, data-theme and localStorage all = dracula, and /deck showed data-theme = dracula.
- CI "Electron durable theme smoke" passed.

## 6. Beta v0.1.19-pr.26: PASS
- **sha256 matches GitHub's digests:**
  - AppImage `a60e5496…cfc31` (128627149 B)
  - latest-linux.yml `a6e7b9e7…2e50`
  - linux zip `6ccae1b3…a878`
- The yml sha512 matches the AppImage.
- **Built from c46bf2e:**
  - PORTABLE.md says "git SHA: c46bf2e. Release tag: v0.1.19-pr.26".
  - AppImage `build/index.js` and all of `public/build` are byte-identical to my build:remix of the tarball.
- Tag ref and `target_commitish` = c46bf2e. Published 19:12 MT Oct 8.
- **Versions:** package.json, AppImage name, yml and UA all say 0.1.18 (expected under #23).

## 7. Present unchanged: Y
`stagedSongSlide.ts` and `Present/` are byte-identical to base 3a8ebd6.

## 8. Existing decks open: Y
- Harness 45/45.
- Restore: sqlite PASS, json PASS.
- Existing-decks UI on a base-era seed: tip PASS, packaged PASS.

## 9. CI: green on the exact head
- **11/11 success**, run **37868229710** (19:07–19:12 MT Oct 8), on c46bf2e.
- mergeable true / clean.

## 10. F-items
- **F1 unchanged.** Scratch "Replace" overwrites the library song (same id) with no deck update prompt (`deckUpdatePromptShown:0`).
- **F2 unchanged.** "(1 Not updated to the latest library version)" vs "not updated…" casing.
- **F4 unchanged.** `*.server` 404 with `{"message":"Unexpected Server Error"}`.
- **F6 unchanged.** Bare /library still says "Library (coming soon)" (`library.tsx:14`).
- F3 and F5 remain fixed.

## New findings (non-blocking)
- **N1. Hand edits saved through the panel are labelled "Not updated", not "edited by hand".**
  - After saving "HAND EDITED" words in state I and then editing the library song, the update prompt says "1 linked slide (1 Not updated to the latest library version)".
  - It does not flag the slide as hand-edited, because `applySongCommitToDraft` sets the synced fingerprint to the hand-edited words.
  - Risk: applying the library update would overwrite those edits without the hand-edit overwrite warning (AC-013 covers hand edits made by deck-file load, which still warn).
  - Recorded, not asserted.
- **N2.** The Esc unit test bypasses the keyboard path (calls `escapeRef` directly), so CI is green despite defect 1.
- **N3.** Version note: everything shipped says 0.1.18 under tag 0.1.19-pr.26 (expected).

## NOT RUN
- AC-011 step-by-step staging inside a Present window. It is covered by byte-identity and the unit/e2e tests.
- Screenshot of the Electron Present BrowserWindow itself: Playwright-over-CDP doesn't surface it. Its existence is shown by the CDP target list (`evidence/cdp-targets-after-keys.json`).
- Mac/Windows installers and zips, and the .deb: not downloaded.
- Esc on an existing **linked** song slide with unsaved hand-edit words: not run separately. The same code path as defect 2 applies (panel-local state), so I expect the same result.

## Paths
- **Verdict:** `VERDICT.txt`, `evidence/SUMMARY.txt`
- **Regression:** `evidence/full-jest-run{1,2}.log`, `evidence/flake/`, `evidence/remix-e2e.log`, `evidence/electron-e2e.log`, `evidence/test-diffs.txt`
- **Polish:**
  - `evidence/redesign-{tip,packaged}.log`
  - `evidence/screens/redesign-{tip,packaged}-POLISH-2.json`
  - `evidence/escprobe-tip.json`
  - `evidence/emptylib-{tip,packaged}.json`
  - screenshots `screens/*-I-*.png`, `*-P2-*`, `*-P3-menu-focus.png`, `*-P4-no-library-id.png`
- **Fresh-home tip rerun:** `rerun-harness-tip.sh` (N = next-c46bf2e), `/tmp/rerun-c1.log`: same 15/1
- **AC / blockers / scratch:** `evidence/{acceptance,blockers,scratch}-{tip,packaged}.log`
- **Electron:**
  - `evidence/electron-{keys,ui}-packaged.log`
  - `cdp-targets-after-keys.json`, `cdp-version-ua.txt`
  - `electron-theme-{set,check}.log`
- **Beta and CI:** `beta/`, `evidence/beta-sha256.txt`, `evidence/ci-checks.txt`
- **Harness:** `/workspace/poster-pr26-regate/regate.sh`, `evidence/harness/{redesign,empty-lib,esc-probe}.mjs` (4737baa backups `*.4737baa.mjs`)
