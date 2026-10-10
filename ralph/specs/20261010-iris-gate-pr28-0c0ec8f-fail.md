# PR #28 epic-005 Background images: re-gate at 0c0ec8f

**FAIL, 0c0ec8fda7e59da78d426a289b0a4617f7c92a00**

- Head is 0c0ec8f (rechecked at 13:50 MDT after the interruption). Base is main da454f1, and PR #26 is already in main. The PR is open, mergeable, state clean. Nothing was merged, approved, pushed or commented. All source came from tarballs, and all typing used real keys.
- f7ce1c0..0c0ec8f is 6 commits and 29 files. The delta diffs are in evidence/delta-*.diff.

## Blocking failures
1. **URL import is broken in every build (REQ-008, AC-007, Decision 3).**
   - Every URL fails with "Enter an image URL.": the local no-CORS host, google.com, python.org, debian.org, and even CORS-enabled Wikimedia. This fails in the prod build, against the packaged server, and in the real Electron window.
   - Cause: `posterSessionRelay.js:117 app.use('/api/poster', express.json())` reads the body before the Remix action `/api/poster/fetch-image`, so `request.json()` fails.
   - Proof: the same POST sent as text/plain succeeds (evidence/proxy/root-cause.txt).
   - This is a regression from f7ce1c0, where CORS hosts did import.
   - It was not caught because the e2e test mocks `/api/poster/fetch-image` and the unit tests mock fetch.
2. **Row (c), program thumbnail vs Present: FAIL.**
   - `ProgramThumbnailPanel` hard-codes `presentFramePreviewScale(220, …)`, but the thumbnail renders 512 px wide. The background only fills the top-left 220×89 px, and the rest is #111.
   - Thumbnail MAD vs Present: 37–92 for every mode. The picker preview now matches: MAD 3.9–16.8 (fit and tile fixed).
   - Same in tip and packaged (pm-*-table.json; screens/pm-tip-fill-dim0-*.png).
3. **Images bigger than about 75 KB never reach a browser Present window (AC-001/REQ-001 in the prod build).**
   - `/api/poster/deck-command` returns 413, because express.json has a 100 kb limit. Present silently keeps showing the previous image.
   - Ladder: 33, 48 and 65 KB show; 96 KB, 241 KB, 825 KB and 2.5 MB do not. This holds for tip and for a browser against the packaged server (bigimg-*.log).
   - Real Electron Present windows show all sizes, because they use IPC (bigimg-electron.log).
   - This was already present at f7ce1c0 (bigimg-f7ce1c0.log). The f7ce1c0 gate missed it because its fixtures were small.

## Counts
- tsc 0, build:remix 0.
- Jest 485/485 twice. Flake 10/10 isolated and 10/10 whole-file.
- Remix e2e 55 + 13. Electron e2e 13.
- Existing-decks harness 45/45. Existing decks UI: PASS on tip and packaged.
- PR #26 harnesses, tip and packaged: acceptance 21/0 and 21/0, scratch 17/0 and 17/0, blockers 9/0 and 9/0, redesign 21/0 and 21/0, routes probe OK. Real book import (packaged): 268.
- Restore of base-era backups: sqlite PASS, json PASS.
- bg harness (title layer set by file, so the URL bug does not cascade):
  - tip 21/1, packaged server 21/1, real Electron 18/1 + 3 NOT RUN (covered by the browser run). The only failure in each is the no-CORS URL import.
  - URL-mode run: cascades from the URL bug (bg-tip.log, informational).
- previewmatch 6/1 on tip and packaged (thumbnail). size20 4/0.
- stagedSongSlide.ts is byte-identical to main.

## AC / REQ matrix (prod build = tip; packaged = AppImage server + real Electron windows)
| ID | Result | Evidence |
|---|---|---|
| AC-001 / REQ-001 | **FAIL** | 6 types PASS with small images on tip, packaged and Electron. Browser Present drops images over ~75 KB (413). |
| AC-002 / REQ-002 | PASS | Title text layer blue behind the text, red whole-slide image (AC002). |
| AC-003 / REQ-003, REQ-004 | PASS | Override on all 6 types plus 'Use deck default'. Title-layer override and reset. Saved keys correct. |
| AC-004 / REQ-005 | PASS | Picture contain-fitted over the background. |
| AC-005 / REQ-006 | PASS | Fill, fit and tile render as named, fill is the default, tile period checked. |
| AC-006 / REQ-007 | PASS | Dim 0.50 on both images, in the editor and in Present. |
| AC-007 / REQ-008, REQ-009 | **FAIL** | File images survive deletion, offline, export to a fresh install, a copied library, and sqlite/json restore. URL images can't be imported at all. |
| AC-008 / REQ-008 | PASS* | Invalid, 404, HTML, empty, offline, ftp and file:// all show an error and the image field stays empty. *Server-side failures show the wrong text ("Enter an image URL."). The URL text box keeps the failed URL. |
| AC-009 / REQ-010 | PASS | Green screen keeps both layers. Image slide picture shown, matching SHOW_IMAGE_PICTURE_IN_GREEN_SCREEN=true. |
| AC-010 / REQ-011 | PASS | Present 27/27 byte-identical to base in a live session after background decks (tip and packaged). Restore of an old backup leaves backgrounds empty. |
| AC-011 | PASS | One default per image across all types. |
| AC-012 | PASS | CI 11/11. Song staging identical to base. Title font 96/40 px with and without the layer. |
Totals: AC 10/12, REQ 9/11 (fails: REQ-001, REQ-008).

## Roy's decisions
| # | Result |
|---|---|
| 1 One default per image, overrides, 'Use deck default' | PASS |
| 2 Fill/fit/tile, fill default, dim on both | PASS |
| 3 Images copied into the deck; failed URL shows an error, field empty | **FAIL** (URL import broken; file copy PASS; error and empty field PASS) |
| 4 Picture fitted on top on image slides | PASS |
| 5 Green screen keeps both images | PASS. The image-slide picture is SHOWN in green screen, recorded as Roy's choice as reported by Manny (switch = true). Behaviour matches the switch in Present and the thumbnail. |
| 6 Older decks unchanged | PASS: Present byte-identical, 45/45, data checks. Thumbnail shift is listed as finding N6. |

## Manny's fixes
- **Stale Present: PASS.**
  - Sequence bgA → old → bgA → bgB → old → bgB → bgA → old, all correct, on tip, packaged and Electron.
  - Clearing a deck default with Present open clears it, both by auto-sync and after Send.
  - A per-slide override, Clear (empty) and 'Use deck default' each update Present live.
  - Live row (e): 27/27 Present byte-identical.
- **URL via server/main: FAIL** (blocker 1). There is no main-process handler; Electron uses the same broken HTTP route.
- **Preview tile/fit: picker PASS, thumbnail FAIL** (blocker 2).
- **N1: PASS.** A failed URL keeps the existing default image; on an inheriting slide it creates no override (label, Present and saved JSON all checked).
- **N3: PASS.** A style.backgroundImage or slideStyles.image picture is kept once a deck default exists (legacyimg-*.log).
- **N5: PASS.** `accept=image/*`; a .txt file gets "Please choose an image file." and the existing image is kept.
- **Dedupe, row (d): PASS.**
  - 33 KB image as an override on 20 slides (set in the UI): export 49,305 B with 1 inline copy and 20 `embed:` refs, vs 47,050 B with the image as deck default only and 2,701 B with no image. Save payload 47,576 B.
  - Checkpointed SQLite: 118,784 B.
  - 300 KB image: export 415,398 B vs 413,124 B (1 copy). Checkpointed SQLite 856,064 B (store before checkpoint 930,936 B incl. WAL).
  - Survives deleting a slide (refs resolve, table = 1), sqlite and json backup/restore, and export to a fresh home (tip and packaged).
  - Present display of the 300 KB deduped deck fails only because of blocker 3.
- **E2E typing:** the epic-005 specs use pressSequentially with no fill(). The 9 fill() calls in remix-song-library.spec.ts are unchanged from base.
- **Green-screen image-slide test coverage is back:** the thumbnail integration test covers image slide + background, and Present.background.test has 'green screen shows image-slide picture'.

## Race's rows
- (a) Image, audio, video and green screen with backgrounds in a real Present window: PASS (Electron CDP and browser). Big-image caveat: blocker 3.
- (b) **FAIL.** File images PASS after deletion, offline, a moved deck, a copied library and restore (tip and packaged). URL images can't be imported (NOT RUN, blocked by blocker 1).
- (c) **FAIL** (thumbnail). Picker PASS.
- (d) PASS: stored once. Sizes above.
- (e) PASS: Present 27/27 byte-identical live after background decks, tip and packaged. Thumbnails 12/27 differ by a small vertical text shift (N6).

## Present and song staging
- The Present.tsx delta from f7ce1c0 is +9/-6: the picture source is `file ?? style.backgroundImage`, gated by the switch. No staging logic changed.
- Song staging in a real Present window matches the base sequence exactly, with and without a background.
- Fullscreen in Electron: F grows the window 772→800 px and Esc restores it, with the background kept. CDP getWindowForTarget is unsupported under xvfb, same limitation as before.
- Keys PASS (moved:false ×8). Theme 'dracula' persists across a relaunch.

## Beta and CI
- Tag v0.1.20-pr.28 → 0c0ec8f; release target 0c0ec8f.
- AppImage sha512 matches latest-linux.yml (S2WtYe…nww==, 128,643,612 B). sha256 values are in beta/sha256.txt. PORTABLE.md says "git SHA: 0c0ec8f". The packaged build/ and public/build are identical to the local tip build.
- File names still say 0.1.19 (naming quirk, as before).
- CI run 38077532385 on head 0c0ec8f: success, 11/11 jobs, 11/11 check-runs. Mergeable: true / clean.

## Weakened or deleted tests
- Nothing was deleted without a replacement.
- The f7ce1c0 embedImage URL tests were rewritten to mock the proxy. The AC-008 "leaves the field empty" picker test was replaced by the N1 tests (an intended spec change).
- The green-screen thumbnail test dropped its title-text-layer assertion. It is still covered by Present AC-009.
- Gap: nothing tests the real route through the express stack, which is how blocker 1 shipped. The e2e test mocks the route.

## NOT RUN
- URL-image survival for rows (b) and AC-007: URL import doesn't work (blocker 1). This blocks.
- Electron CDP run of AC-007, export and deck size: covered by the browser run against the same packaged server. Does not block.
- Window-state check for Electron fullscreen: CDP limitation under xvfb; behaviour checked visually. Does not block.

## Findings (non-blocking)
- **SSRF (proxy endpoint):**
  - It fetches localhost and loopback (127.0.0.1 image fetched OK).
  - Error messages leak port state (ECONNREFUSED), so it works as a port-scan oracle.
  - It tries 169.254.169.254 with no timeout (hung more than 20 s).
  - It follows redirects and buffers the whole body before the 8 MB check.
  - The server listens on `*` (LAN-reachable), and a text/plain POST bypasses the JSON parser, so cross-site form CSRF can trigger fetches. Responses have no ACAO header, so they can't be read cross-origin.
  - file:// is refused.
  - (proxy/ssrf-probes.txt)
- Server-side URL failures show "Enter an image URL." instead of the real error.
- After a failed URL, the URL text box keeps the failed URL. The image field is empty.
- Home > Backup Database still downloads HTML, not SQLite, on tip and packaged. Pre-existing.
- Dedupe hash is a custom FNV-64 plus length. On a collision, internEmbeddedImage would overwrite the existing entry. Very unlikely.
- When a slide-override pick is cancelled, or a slide is deleted, the embeddedImages entry is only pruned when a deck default is cleared. Orphans stay in the deck.
- The preview assumes a 1280-wide Present. Tile density will differ at other Present window sizes.
- N6: older-deck thumbnails have a small vertical text shift (0.35–6.7% of pixels). Present is unaffected.

## Key paths
- Summary: evidence/SUMMARY.txt.
- Main harness results: evidence/bgf-{tip,packaged,electron}.log and .json.
- Proxy: evidence/proxy/.
- Big-image ladder: evidence/bigimg-{tip,f7ce1c0,electron,packaged}.log.
- Row (c): evidence/pm-{tip,packaged}-table.json.
- Row (e) live: evidence/live-compare-{tip,packaged}.json.
- Dedupe: evidence/dedupe40k/, evidence/pk-dedupe.json.
- Screenshots:
  - screens/bgf-tip-REQ008-nocors-ui.png and screens/publicurl-tip-noCorsGoogle.png: URL error.
  - screens/pm-tip-fill-dim0-program-thumb.png vs pm-tip-fill-dim0-present.png: thumbnail.
  - screens/bgf-tip-switch-*.png: stale Present sequence.
  - screens/bgf-tip-AC009-green-image.png: green-screen picture.
  - screens/live-tip/: row (e).
