# PR #26 delta re-gate: head 7d46dbf

**Verdict: FAIL**: `7d46dbfd6948f5b0109d2923b9d9e7d3fc8e68ec`

Gated by Grok Bot (executor for Jack/Iris/Race) on Oct 9 2026, 07:29–08:48 MT. The run was interrupted once and resumed; nothing was redone that was already valid. Nothing was merged, approved, pushed, commented on or changed on GitHub. The code came from the GitHub tarball (`git get-tar-commit-id` = 7d46dbfd…; base 3a8ebd6c…). Nothing was cloned and no secrets were printed.

## Why it fails, and how it maps to the verdict rule
**Every check you named as blocking passes:**
- items 1–4;
- all 18 ACs, all 7 decisions and all blocker scenarios;
- the regression suite;
- Present unchanged and existing decks open;
- CI 11/11.

**The FAIL comes from item 6, the re-confirm of polish items 1 and 3, tested with real key presses.** On tip and in the packaged app, you can't type into the state I "Edit words on this slide" box:
- **After the first key, focus jumps to Save slide.**
- **The next keys are lost.**
- **A Space (or Enter) then presses Save slide.** The half-typed hand edit is saved as the slide and the panel closes, with no confirm.

Evidence:
- `evidence/handtype-tip.json` (7d46dbf, tip): x → focus `save-slide-button`; y → lost; Space → panel closed, "Slide saved".
- `redesign-{tip,packaged}.log` step FIX-TYPE: FAIL, same per-key result on both.

**Cause (code):** `SongSlideEditPanel.tsx` L464–467:

```ts
useEffect(() => { if (choice) onFocusSaveSlide?.(); }, [choice, onFocusSaveSlide]);
```

This is the polish-3 "state E → focus Save slide" effect. Every keystroke in the hand-edit box replaces `choice` (and `onFocusSaveSlide` is a new function on every render), so the effect re-fires and steals focus.

**Likely fix:** focus Save slide only when the choice is first picked, e.g. on a change of `choice?.librarySongId` or via a "just picked" flag. Don't focus on every `choice` update.

**History, to be upfront:**
- At 4737baa, focus already jumped to the card after the first key, so typing was lost, but Space did nothing.
- c46bf2e moved that focus to Save slide, which turned it into a premature save.
- I missed this in both earlier gates because my state-I steps used `fill()` rather than key-by-key typing. The c46bf2e polish-1 "Pass" should be read with that caveat.
- Evidence of the same probe on old code: `evidence/handtype-4737baa.json`, `evidence/handtype-c46bf2e.json`.

If Race or Roy decide item 6 is non-blocking under the letter of the rule, everything listed as blocking passes. That is a product call; I'm reporting FAIL because Roy's state I hand-editing doesn't work from the keyboard.

## Head / base
- Head **7d46dbfd6948f5b0109d2923b9d9e7d3fc8e68ec**. I read it at 07:29, 08:19 and 08:48 MT, and it did not move.
- State: open, not merged, mergeable true / **clean**. Size: 67 commits, +12750/−427, 106 files.
- **Base: main 3a8ebd6cd0cc45cf028ed57105b1bbe4b411abbc** (unchanged).
- Delta from c46bf2e:
  - `DeckBuilder.tsx`, `LibrarySongPicker.tsx`, `SongSlideEditPanel.tsx`, `songPanelEsc.ts`;
  - 3 test files;
  - ralph docs.
  - Diff: `evidence/code-delta.diff`.

## 1. Regression: PASS
| Check | Result |
|---|---|
| pnpm install --frozen-lockfile / tsc --noEmit / build:remix | exit 0 / 0 / 0 |
| Jest run 1 / run 2 | 63/63 suites, **427/427** both runs (was 421) |
| Remix e2e (dev + song-library) | **50 + 11 passed** |
| Electron e2e (xvfb) | **12 passed** |
| Flake | isolated **10/10**, whole-file **10/10** |
| Harness tip-check | 45/45 |

## Brief items 1–5
| # | Item | Tip | Packaged | Evidence |
|---|---|---|---|---|
| 1 | Esc with real keys: exactly 3 presses, nothing left | **Pass** | **Pass** | Typed search: Esc 1 clears, Esc 2 goes to the type choice, Esc 3 closes the panel with no pending row. Rows unchanged, library Δ0 (POLISH-2, FIX-ESC, escprobe-tip). |
| 1 | Esc with an empty search | **Pass** | **Pass** | 1 press → type choice; 2nd press → cancelled. |
| 1 | Esc from the type choice | **Pass** | **Pass** | 1 press → cancelled; Δ0. |
| 2 | Scratch song slide, unsaved words | **Pass** | **Pass** | Confirm shown. Decline keeps "conf one UNSAVED" and the panel. Accept closes; on reopen the words are "conf one". A title-only change also asks. |
| 2 | Linked slide, unsaved hand edits | **Pass** (confirm logic) | **Pass** | Confirm shown; decline keeps, accept discards. Tested with `fill()`, and with a 1-key edit in `linkedesc-tip.json`. Multi-key typing hits the FIX-TYPE bug before Esc. |
| 2 | General slide | **Pass** | **Pass** | Title change: confirm; decline keeps; accept discards. |
| 2 | No changes → no dialog | **Pass** | **Pass** | Scratch, linked and general: 0 dialogs, panel closes. |
| 3 | Panel hand edits show "edited by hand" | **Pass** | **Pass** | Saved slide keeps synced fingerprint = library baseline. The prompt shows "Gate HandEdit Deck — 1 linked slide (1 edited by hand)", with no "Not updated". |
| 3 | Later library edit + apply → hand-edit warning; No keeps | **Pass** | **Pass** | "Overwrite protected slides? 1 edited by hand…". No keeps "GAMMA HAND one/two"; on the next edit, Yes overwrites with v3. |
| 4 | Cancel a new slide with another slide selected | **Pass** | **Pass** | While editing slide 2: Cancel, ✕ Close and Esc each give panel 0 and pending 0, with no editor reopening; rows unchanged. |
| 5 | New e2e tests press real keys and would have caught c46bf2e | **Yes** | n/a | See below. |

**Item 5 detail:**
- **They press real keys.** The three new Playwright tests in `remix-song-library.spec.ts` use `locator.press('Escape')` (real key presses) and real dialogs (`page.once('dialog')`).
- **They would have caught c46bf2e, proven by running them on that code.** I ran them against the c46bf2e source (`evidence/newe2e-on-c46bf2e.log`) and **all 3 fail**:
  - the Esc chain fails at "Esc 2 → song-type-choice visible";
  - the existing-song test fails because the panel closed with no dialog;
  - the hand-edit label test fails with "1 Not updated…".
- **New unit tests:** the DeckBuilder unit tests dispatch bubbling keydown events through the real window handler. The SongSlideEditPanel Esc test now asserts that stopPropagation is not called.
- **Weakened or deleted tests:** none deleted. The old SongSlideEditPanel Esc test's `fireEvent.keyDown` on the picker was replaced by a stricter native dispatch with spies. Steps 2 and 3 still call `escapeRef` directly, but the new DeckBuilder unit test and the e2e cover real keys.
- Diffs: `evidence/test-diffs.txt`.
- **Gap:** no test types multiple keys into the hand-edit box, which is why CI misses FIX-TYPE.

## Item 6: re-confirm polish items 1, 3, 4, 5
| Polish | Tip | Packaged | Notes |
|---|---|---|---|
| 1 State I / Use library words | **Pass** with `fill()`; **FAIL with real typing** | Same | Current library words restored; the note shows on open; saved slide linked and no longer hand-edited (POLISH-1). Typing into the box is broken (FIX-TYPE). |
| 3 Focus | **Pass** for the listed checks; **the state E focus effect causes FIX-TYPE** | Same | Type-card arrows move focus only; the Add slide menu takes focus and arrows work; state E = Save slide. Empty library: B = `add-song-go-import`, type choice = `song-type-scratch` (empty-lib PASS on tip and packaged). |
| 4 Library ID gone | **Pass** | **Pass** | |
| 5 Tight checks | **Pass** | n/a | All three are still present (unchanged since c46bf2e). |

## 2. AC matrix (tip AND packaged): 18 Pass / 0 Fail
acceptance.mjs: **21/0 on tip, 21/0 packaged**, with 0 page or console errors. scratch.mjs: 17/0 on both. Real 268-song book import in the packaged app: review first, 0 imported before confirm, then 268. (AC-011 Present staging: static and unit only, as before.)

## 2b. Blockers (blockers.mjs **9/0 tip, 9/0 packaged**)
All pass on both:
- library writes only on Save slide;
- every Cancel path leaves nothing;
- the existing-scratch review keeps edits;
- multi-import on an existing slide.

## 3. Roy's 7 decisions: 7/7 Pass (tip and packaged)
- **Decision 7** with a real Present popup on tip and packaged.
- **Electron packaged with a real Present BrowserWindow:** the CDP `/json/list` shows the `/presentation?sessionId=…` target. Keys mode gave 8× `moved:false` (list Edit, row-text click, list background, panel Cancel, panel background, type card, search, Words), with a sanity-check move, and result PASS. UA poster/0.1.18 Electron/40.10.0.

## 4. Spec diffs (non-blocking, unchanged)
- S6 search area, S7 footer and S8 row-Send focus: as in the 4737baa and c46bf2e gates.
- The c46bf2e minor item (cancel reopened the previous slide's editor) is fixed (item 4).

## 5. Theme persists: PASS
Packaged app: I set dracula and theme.json was written. After a kill and relaunch with the same HOME, home showed select, data-theme and localStorage all dracula, and /deck showed dracula. The CI theme smoke also passed.

## 6. Beta v0.1.19-pr.26: PASS
- **sha256 matches GitHub's digests:**
  - AppImage `14ab080f…13356` (128631243 B)
  - latest-linux.yml `fc5a76da…c302`
  - linux zip `f8e0d19c…d446`
- The yml sha512 matches the AppImage.
- **Built from 7d46dbf:**
  - PORTABLE.md says "git SHA: 7d46dbf".
  - AppImage `build/index.js` and `public/build` are byte-identical to my build:remix.
- Tag ref and `target_commitish` = 7d46dbf. Published 07:27 MT.
- Versions say 0.1.18 (expected).
- An extra `-8f30d3f` portable zip is attached (an intermediate build). Noted only.

## 7. Present unchanged: Y
`stagedSongSlide.ts` and `Present/` are byte-identical to base 3a8ebd6.

## 8. Existing decks open: Y
- Harness 45/45.
- Restore: sqlite PASS, json PASS.
- Existing-decks UI: tip server PASS, packaged PASS.

## 9. CI: green on the exact head
- **11/11 success**, run **37936315255** (07:22–07:27 MT), on 7d46dbf.
- mergeable true / clean.
- Details: `evidence/ci-checks.txt`.

## 10. F-items
- **F1 unchanged.** Scratch Replace gives no deck prompt (scratch.mjs F1 check).
- **F2:** the panel hand-edit case now says "edited by hand". The "Not updated" casing in the out-of-date line is unchanged (acceptance log).
- **F4 unchanged.** 404 with "Unexpected Server Error".
- **F6 unchanged.** "Library (coming soon)".
- F3 and F5 remain fixed.

## New findings
- **N1 (verdict-relevant, see top). FIX-TYPE:** typing in the state I hand-edit box loses focus after one key, and Space/Enter then saves the slide.
- **N2.** The window Esc handler now returns early on `e.defaultPrevented`. Any future inner control that preventDefaults Esc will silently swallow it. No current case was found.
- **N3.** Versions say 0.1.18 under tag 0.1.19-pr.26 (expected).
- Old N1 from c46bf2e (hand edits labelled "Not updated") is **fixed**.

## NOT RUN
- AC-011 step-by-step staging inside a Present window. It is covered by byte-identity and the unit/e2e tests. Non-blocking, as before.
- A screenshot of the Electron Present BrowserWindow itself (CDP doesn't surface it). Its existence is shown by `evidence/cdp-targets-after-keys.json`.
- Mac/Windows/.deb artifacts.

**Infra notes:**
- The first tip accept run lost its server when my shell call timed out (`evidence/redesign-tip.killed-server.log`, ERR_CONNECTION_REFUSED). It was re-run detached, and that run counts.
- The first FIX-CONFIRM linked failure was the FIX-TYPE bug, not the confirm logic: the typed space saved the slide. I switched that sub-step to `fill()` and added FIX-TYPE. The fresh-home tip rerun and the packaged run both used the corrected harness: **20/1 each, the 1 being FIX-TYPE**.

## Paths
- **Verdict:** `VERDICT.txt`, `evidence/SUMMARY.txt`
- **Regression:** `evidence/full-jest-run{1,2}.log`, `remix-e2e.log`, `electron-e2e.log`, `flake/`, `tsc.log`, `test-diffs.txt`, `newe2e-on-c46bf2e.log`
- **Items 1–4 and 6:**
  - `evidence/redesign-{tip,packaged}.log`
  - `screens/redesign-{tip,packaged}-{POLISH-2,FIX-ESC,FIX-CONFIRM,FIX-HAND,FIX-TYPE}.json`
  - `escprobe-tip.json`, `linkedesc-tip.json`
  - `handtype-tip.json`, `handtype-{4737baa,c46bf2e}.json`
  - `emptylib-{tip,packaged}.json`
  - screenshots `screens/*FIX-*.png`
- **AC / blockers / scratch:** `evidence/{acceptance,blockers,scratch}-{tip,packaged}.log`
- **Electron:** `electron-{keys,ui}-packaged.log`, `cdp-targets-after-keys.json`, `cdp-version-ua.txt`, `electron-theme-{set,check}.log`
- **Beta and CI:** `beta/`, `evidence/beta-sha256.txt`, `evidence/ci-checks.txt`
- **Harness:** `regate.sh`, `rerun-harness-tip.sh`, `evidence/harness/{redesign,esc-probe,linked-esc-probe,handtype-probe,empty-lib,electron-window}.mjs` (backup `redesign.c46bf2e.mjs`)
