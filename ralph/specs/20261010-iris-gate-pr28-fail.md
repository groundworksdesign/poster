# PR #28 gate (epic-005: Background images): **FAIL** on f7ce1c0ae657569180287aa19ebee91247806f4e

All times are MT. Rules followed: tarballs only; GitHub read-only; no merge, approve, push or comment; no secrets printed. Every text field was typed key by key (pressSequentially); fill() was never used in the new harnesses.

## Head and base
- **PR #28:** head **f7ce1c0**, rechecked at 12:34. Open, not merged, mergeable=true, mergeable_state=clean.
- **Base:** main da454f1 ("Bump version to 0.1.19").
- **PR #26:** merged at 10:04 on Oct 9 as a82ab7d, which is in main (main is 1 commit ahead of it). Head is 25 commits ahead of main and 0 behind.
- **Tarball IDs:** tip f7ce1c0 and base da454f1, both confirmed with git get-tar-commit-id.

## Why FAIL
1. **Present keeps showing stale deck backgrounds (blocking).** The fault is in `applyPresentPayload`, which only applies `defaultBackground` / `defaultTitleTextBackground` when the key is `in` the payload. DeckBuilder sends `deck?.defaultBackground`, so when a deck has no default the value is undefined and JSON drops the key. Present then keeps the previous value. Two consequences:
   - **LIVE-OLDDECK:** an older deck (no background fields) loaded in a session that has already shown a background deck appears in Present with the previous deck's background. Its own #336699 slide colour became red. This fails **AC-010 / REQ-011 / Decision 6**. It reproduced on the tip prod build, the packaged server, and the real Electron Present window.
   - **LIVE-CLEAR:** Clear on a deck default empties the editor, but an open Present still shows the image (plan item deck-defaults-ui "clear").
   - Screenshots: `screens/bg-electron-stale-old-deck-same-session.png`, `screens/bg-electron-stale-after-clear.png`, `screens/KEY-electron-SHEET.png` (bottom right).
2. **REQ-008: web URLs only work when the host sends CORS headers.** `embedImageFromUrl` fetches with `mode:'cors'` from the renderer.
   - A real Wikimedia PNG (ACAO *) works.
   - A real google.com logo PNG (no ACAO) fails with "Could not download the image: Failed to fetch". The local /nocors host fails the same way.
   - This happens in Chromium and in the packaged Electron 40.10.0.
3. **Race (c): the editor previews don't match Present for tile.** Both the picker preview and the program thumbnail draw tiles at the image's natural pixel size instead of scaled to the slide, so they show 1 tile (picker) or about 5 (thumbnail) where Present shows about 13 across.
   - Tile: MAD 90.8 / 80.3 (dim 0), 46.1 / 40.4 (dim 0.5).
   - Fill matches (MAD ≤3.2). Dim matches.
   - Fit: MAD 25, because the Present band for non-title slides is 1280×519 while the previews are 16:9, so letterbox bars land on different sides.
   - Contact sheet: `screens/pm-tip-SHEET.png`.

## Counts
| Suite | Tip (prod build) | Packaged AppImage |
|---|---|---|
| tsc / build:remix | 0 / 0 | AppImage build/index.js and public/build byte-identical to local tip build |
| Jest | 462/462 ×2 (68 suites) | n/a |
| Flake (PR26) | 10/10 isolated, 10/10 whole-file | n/a |
| Remix e2e | 53 + 13 pass (the first run was a missing-browser setup error, ignored) | n/a |
| Electron e2e | 13 pass | n/a |
| Existing-decks harness | 45/45 | existing-decks-ui PASS |
| PR26 acceptance / scratch / blockers / redesign | 21/0, 17/0, 9/0, 21/0* | 21/0, 17/0, 9/0, 21/0 |
| Routes probe | 2 JSON-200 lines (expected) | same |
| bg.mjs (new, epic-005) | **18/2** (LIVE-CLEAR, LIVE-OLDDECK) | browser→packaged server **18/2**; real Electron windows **15/2 + 3 NOT RUN (covered)** |
| previewmatch (Race c) | 6/1 (tile) | 6/1 (tile) |
| size20 (Race d) | 4/0 | 4/0 |
| Visual vs base (Race e), Present | 27/27 pixel-identical | 27/27 pixel-identical |

\* The first tip redesign run hit EADDRINUSE on port 3325: a stray process from before the box restart held the port, then died. That log is kept as `redesign-tip.serverdied.log`. A clean rerun on a fresh home (port 3326) gave **21/0**.

## AC / REQ matrix (tip / packaged; "E" = real Electron windows)
| ID | Result | Evidence |
|---|---|---|
| AC-001 / REQ-001 | **PASS** tip / pk / E | The deck default shows in Present on general, title, image, song, audio and video (pixel-sampled corners are red). A per-slide override was set through the UI on all 6 types. `screens/bg-*-AC001-*.png`, `AC003-override-*.png` |
| AC-002 / REQ-002 | **PASS** | Title text layer (blue) sits under the title and subtitle; the whole-slide layer (red) is outside it. No text layer on other types. `AC002-title.png` |
| AC-003 / REQ-003 / REQ-004 | **PASS** for set, override and reset (see LIVE-CLEAR below) | Override on all 6 types, then "Use deck default" restores the deck image. Title-layer override (magenta) resets to blue. The stored JSON has a `background` key only while overridden. |
| Plan deck-defaults-ui "clear" | **FAIL** | LIVE-CLEAR: an open Present keeps the cleared image. |
| AC-004 / REQ-005 | **PASS** for UI-made image slides (`file`) | The picture is drawn with contain on top and the background shows at the sides. See N3 for legacy `style.backgroundImage` pictures. |
| AC-005 / REQ-006 | **PASS** | Computed style is cover / contain / auto+repeat. Pixels: fit has #333 letterbox bars; tile has a 40 px period. A new image defaults to fill. |
| AC-006 / REQ-007 | **PASS** | Dim slider moved by keyboard to 0.50 on both images. Editor preview pixel is [112,8,8]; Present is [112,8,8] for the whole-slide layer and [8,16,112] for the title layer. |
| AC-007 / REQ-009 | **PASS** tip / pk | The original bytes are embedded (base64 decodes byte-equal to the source). After deleting the source file, killing the URL host, and blocking all non-local requests, the deck still shows both images. It also still shows them after export → load on a fresh install, after copying the library to a new home, and after restoring the library on a fresh home (sqlite and json). |
| AC-008 | **PASS** | Invalid URL, 404, HTML, empty body, offline port and ftp all show an error and leave the field empty. Side effects are in N1. |
| REQ-008 | **FAIL** | File picker works; URL works only on CORS hosts (see Why #2). |
| AC-009 / REQ-010 | **PASS** | Green screen keeps the whole-slide and text layers on title, general, song, audio, video and image. |
| AC-010 / REQ-011 | **FAIL** | Opened fresh: Present is 27/27 pixel-identical to base and /library/open JSON is byte-identical. Opened after a background deck in the same session: shows the previous deck's background (LIVE-OLDDECK). |
| AC-011 | **PASS** | One deck default applies to all 6 types. |
| AC-012 | **PASS** | CI 11/11. stagedSongSlide.ts is byte-identical. Song staging sequence matches base. Title font size is 96 px / 40 px with and without layers. |

## Roy's decisions
| # | Decision | Result |
|---|---|---|
| 1 | One deck default per image; per-slide override; "Use deck default" resets | **PASS** (tip, pk, E) |
| 2 | Fill/fit/tile with fill as default; dimming toward black on both images | **PASS** in Present. Tile previews don't match (Race c). |
| 3 | File and URL images copied in; survive file deletion and the URL going offline; failed URL shows an error and leaves the field empty (bad URL, 404, non-image) | **PASS** as specified. Non-CORS hosts can't be imported at all (REQ-008), and a failure wipes the existing image (N1). |
| 4 | Image slides: picture fitted on top of the background | **PASS** for `file` pictures (N3 for legacy) |
| 5 | Green screen keeps both images | **PASS** |
| 6 | Older decks look unchanged | **FAIL** in a live session (LIVE-OLDDECK). Fresh open is identical: existing-decks 45/45, byte-identical JSON, Present 27/27 pixel-identical. |

## Race's rows (tip / packaged)
| Row | Result |
|---|---|
| (a) Real Present window: image, audio, video and green screen with backgrounds | **PASS / PASS** (browser popup and real Electron Present BrowserWindow). `bg-electron-AC001-{image,audio,video}.png`, `bg-electron-AC009-green-*.png` |
| (b) File and URL images after source deletion, while offline, after a move | **PASS / PASS**. Covers: source deleted, host down, internet blocked; exported deck on a fresh install; library copied to a new home; sqlite and json library restored on a fresh home. `move-tip/`, `pk-*.json` |
| (c) Fill/fit/tile and dim: editor preview vs Present | **FAIL / FAIL** (tile). Fill and dim match; fit's letterbox differs by frame aspect. `screens/pm-tip-SHEET.png`, `pm-*-table.json` |
| (d) One image reused on 20 slides | **Stored 20 times** (no dedup) as overrides; once as the deck default. 308 KB PNG: deck default = 412 KB save; 20 overrides = 8.21 MB save/export (19.9×, 20 copies), sqlite library 17.4 MB. Separately, a 3 MB PNG used as default plus 3 overrides gave a 16.0 MB deck (saved OK in 1.8 s). Finding N4 (the plan's risk note says not to duplicate). |
| (e) Older decks identical vs base screenshots | **PASS / PASS** for Present: 27/27 pixel-identical, internet blocked. The program thumbnail in the editor differs on 18/27 (text moved a few px, N6). The live-session stale bug is graded under AC-010. |

## Present.tsx review (+99/-13) and song staging
- **R1 (bug, blocking):** stale deck defaults, as in Why #1.
- **R2:** with a whole-slide layer, the image-slide picture is `slide.file` only. Legacy `style.backgroundImage` and deck `slideStyles.image.backgroundImage` pictures disappear (N3).
- **R3:** in green screen, the image-slide picture now shows when a deck background exists (base suppressed it).
- **R4:** `overflow:hidden` was added to the frame and overlay. No visual change on existing decks.
- **R5:** a legacy per-slide `style.backgroundImage` on non-image slides is ignored when a deck default exists.
- **R6:** in green screen, the title overlay's colour is dropped when a text-layer image is present (intended).
- **R7:** `deckBgProxy as any`.
- Fullscreen and key code are unchanged from base.
- **Song staging** (real Present): title → 2 lines → 2 lines → … → Reverse. The sequence is identical on base, on tip without a background, on tip with a background, and in the packaged Electron window (`*-song-staging.json`, `song-base.log`).
- **Fullscreen (packaged Electron):** F grows the Present window (772→800 inner height, chrome hidden) and Esc restores 772, with the background still showing. Xvfb has no window manager, so true screen-size fullscreen can't be confirmed (`electron-fs.log`); the probe's strict check reported FAIL for that reason only.
- **Keys:** decision 7 PASS, 8× `moved:false` (`electron-keys-packaged.log`).

## Backup and restore, theme
- **Library restore keeps images.** sqlite and json backups restored through Home > Restore on fresh homes still show both images. Restoring old base-era backups (sqlite and json) leaves backgrounds empty: no keys, no layers.
- **N2 (pre-existing on base, not a regression):** Home > Backup Database downloads the HTML page (27 KB `<!DOCTYPE html>` saved as poster.sqlite), on the browser, tip, packaged and base alike. The backup route also streams only the main sqlite file without the WAL. For the restore tests I used the library file after a clean quit (checkpointed), not the Backup button.
- **Theme (packaged):** set to dracula, theme.json was written, and it persisted after relaunch (home and deck).

## Beta v0.1.20-pr.28
- **Tag:** ref refs/tags/v0.1.20-pr.28 → commit f7ce1c0; target_commitish f7ce1c0; prerelease; published 10:55.
- **Checksums**, all matching the GitHub digests:

| Asset | sha256 |
|---|---|
| AppImage | eb49fa5f…3a8f |
| latest-linux.yml | 31bef4d7…d40c |
| portable linux zip (f7ce1c0) | 8f0dada9…c6fd7 |

- The yml sha512 matches the AppImage. PORTABLE.md says git SHA f7ce1c0. The AppImage build/ and public/build are byte-identical to the local f7ce1c0 build.
- The app reports 0.1.19 under tag v0.1.20-pr.28 (N7).
- **Headless launch:** the background shows on a slide and in Present (`bg-electron-AC001-*.png`, `bg-electron-present-full-title-default.png`, `electron-fs-fullscreen.png`).

## CI
Run 38069345941 "PR Build" on head f7ce1c0 succeeded (10:51–10:56); check-runs 11/11 success, rechecked at 12:34. Mergeable: clean.

## Tests weakened or deleted
- Nothing deleted.
- **Weakened:** `programThumbnail.integration.test.tsx`. The green-screen legacy-suppression test changed its slide type from image to title, so legacy image suppression on an image slide in green screen is no longer covered.
- New tests use `fill()` for the URL field and never exercise the stale-Present case.

## Findings (non-blocking unless noted)
- **N1.** A failed URL wipes an existing image. On a deck default it deletes the default. On a slide that inherits it creates an empty override, so the slide silently loses the deck background and the label switches to "(slide override)".
- **N2.** Backup Database button downloads HTML (pre-existing).
- **N3.** Legacy image-slide pictures in `style.backgroundImage` or `slideStyles.image` vanish once a deck default is set (`legacyimg-*.log`).
- **N4.** No dedup: the same image used as 20 overrides is stored 20× (8.2 MB vs 412 KB).
- **N5.** The file picker accepts a non-image file (text) and embeds it as data:text/plain with a broken preview and no error.
- **N6.** Program thumbnail text moved a few px for older decks (Present unaffected).
- **N7.** Version 0.1.19 under tag 0.1.20-pr.28.
- **N8.** Green screen now shows image-slide pictures when a deck background exists.
- **N9.** Present's non-title frame is a 1280×519 band, so fit/fill crop differently from the 16:9 previews.

## NOT RUN
- **AC-007 offline/export and the deck-size step inside the Electron-CDP bg run.** Electron can't open a new browser context or a download dialog. Both are covered by the browser run against the same packaged server, so this doesn't block.
- **True OS fullscreen bounds.** Xvfb has no window manager; F/Esc toggling was verified. Doesn't block.

## Paths
- Root: /workspace/poster-pr28-gate/ (src-tip, src-base, GATE.md, VERDICT.txt, gate.sh)
- Evidence: evidence/SUMMARY.txt and evidence/bgharness/ (bg.mjs, previewmatch.mjs, size20.mjs, presentcheck.mjs, move-backup.sh, packaged-bg.sh, visual.mjs, compare.mjs, legacyimg.mjs, publicurl.mjs, electron-fs.mjs)
- Logs: bg-{tip,packaged,electron}.log/.json, pm-*-table.json, size20-*.sizes.json, visual-compare-*.json, move-tip/, pk-*.json, present.diff, test-diffs.txt, beta-sha256.txt, ci-checks.txt
- Key screenshots (evidence/screens/):
  - KEY-electron-SHEET.png
  - bg-electron-AC002-title.png
  - bg-electron-AC004-image.png
  - bg-electron-AC009-green-title.png
  - bg-electron-stale-old-deck-same-session.png
  - bg-electron-stale-after-clear.png
  - pm-tip-SHEET.png
  - visual-thumb-diff-SHEET.png
  - publicurl-electron-noCorsGoogle.png
