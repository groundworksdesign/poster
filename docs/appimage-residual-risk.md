# AppImage residual risk (Jack checklist)

**Status:** Packaged Linux AppImage is **not** claimed fully proven by this clean-architecture harden loop.  
**Audience:** Jack (manual packaged regression)  
**Branch / draft PR:** `cursor/clean-architecture-restructure-018c` / draft PR #21 (keep draft; do not merge for this loop)

This note records residual risk after the `src/` rings + `tests/e2e` move, what automated coverage already proved, and a short manual AppImage checklist.

---

## Jack AppImage baseline (tip `c3a1642`) — NOT READY (current packaged blocker)

After REQ-009 engineering QA (about:blank / late-poster / Start gate), Jack retested tip `c3a1642`:

| Area | Result on tip `c3a1642` |
| --- | --- |
| **Blank-deck + import cold Present** | **FAIL (flaky) 7/12 (~58%)** — SSR Loading with **preload + real presentId URL** (not about:blank) |
| Library Open → Present | Primary **3/3 PASS**; later **1/2 flake** |
| Tip unpackaged Electron (blank + library) | PASS |

**REQ-010 (selected):** Harden Present **client hydrate** when main-owned present-session URL already has `presentId` and preload is present. Hypothesis: AppImage/FUSE `loadURL` / Remix SSR / `present-ready` handshake timing; Start/send may still race; preload may not finish before first paint. Tip Electron rarely hits this. **Still not AppImage proof** until Jack cold repeats are green.

---

## Jack AppImage baseline (tip `7c947cd`) — NOT READY (superseded by `c3a1642`) (superseded by `c3a1642`)

After REQ-008 Library Open→Present landed, Jack retested tip `7c947cd`:

| Area | Result on tip `7c947cd` |
| --- | --- |
| Library Open → Present | **3/3 PASS** (REQ-008) |
| **Blank-deck cold Present + send after file import** | **FAIL (flaky)** — ~1/3–1/2 fail |
| Tip unpackaged Electron | PASS |
| CI installers | green |

**REQ-009 engineering harden (this branch):** Import CTA uses `_blank` (not named `posterDeck`); Open Present waits briefly for `window.poster` before choosing electron-direct vs about:blank; Start/send gated until Present `child-ready`. Automated: `electron-import-present-send.spec.ts` (import → Open Present → send) + unit late-poster coverage. **Still not AppImage proof** — Jack must re-run packaged Import → Present → send cold repeats.

---

## Jack AppImage baseline (tip `9f124e1`) — NOT READY

Recorded before hydrate / path harden work. Do **not** treat as a green AppImage sign-off:

| Area | Result on tip `9f124e1` |
| --- | --- |
| Cold Present first-open hydrate | **Flaky** — 1/3 PASS, 2/3 stuck SSR `Loading...` |
| On Program | **Blocked** while Present stays on Loading |
| Home / library save-quit-reopen / theme | PASS |
| Clean-arch layout | PASS |
| CI on that tip | Unit green; Remix E2E + Electron smoke **red** (helpers resolving under `tests/`) |

---

## What this loop already proved (not AppImage)

Engineering + automated QA on the current tip (draft PR #21) — **unpackaged / CI Electron + Remix**, not a built `.AppImage` binary:

| Area | Evidence | Verdict |
| --- | --- | --- |
| E2E repo roots | `tests/e2e/repoRoot` + selfcheck; helpers launch from repo root | PASS |
| Present cold hydrate (engineering) | Main-owned `present-session` `loadURL` + Deck absolute URL path; Electron e2e waits `present-ready` | PASS (dev/Electron e2e) |
| On Program after hydrate | `electron-program-thumbnail.spec.ts` + full Electron suite | PASS (dev/Electron e2e) |
| Import → Present → send order | `electron-import-present-send.spec.ts` (REQ-009; Present *after* FileReader import) | PASS (dev/Electron e2e) |
| Library Open → Present | `electron-library-present-hydrate.spec.ts` (REQ-008) | PASS (dev/Electron e2e); Jack AppImage 3/3 @ `7c947cd` |
| Layer import rule | `src/__tests__/layer-import-rule.test.js` | PASS |
| Config / operator paths | adapters + `config-path-alignment` guard | PASS |
| Unit / integration | `tsc --noEmit`; Jest unit suites | PASS |
| Remix + Electron Playwright | `test:e2e:remix`; `test:e2e:electron`; Electron `globalSetup` rebuilds production `build/` | PASS (tip Electron) |
| Helpers-under-tests CI red | Confirmed gone via `repoRoot.selfcheck` + green e2e | PASS |

**Residual:** A real AppImage (or other installer) cold-open pass on Jack’s machine is still required for packaged sign-off — especially **Import → Open Present → send** after tip `7c947cd`. Do not equate Electron Playwright smoke with AppImage proof.

---

## Residual risks to watch on AppImage

1. **Blank-deck Present + send after file import (REQ-009)** — Flaky on tip `7c947cd` AppImage (~1/3–1/2). Tip Electron / CI e2e can pass while packaged FUSE + post-import preload timing still fails. Engineering harden is in-tree; **re-verify on the AppImage binary** (Import → Open Present → send ×3+).
2. **Cold Present first-open hydrate** — Historically flaky on packaged AppImage (SSR `Loading...`). Engineering fix is in-tree; **re-verify on the AppImage binary** (see checklist ×3).
3. **On Program** — Depends on Present reaching `present-ready`. If cold hydrate fails, thumbnail/state stays empty.
4. **Production vs development Remix build** — Electron loads on-disk `build/` under production. A development `build/` (`jsx-dev-runtime`) SSR-500s Home. Packaging / CI must ship a production Remix build (local Electron e2e uses `tests/e2e/electron.global-setup.cjs` to guard this).
5. **Native modules** — `better-sqlite3` must match Electron ABI inside the AppImage (`npmRebuild` / pack scripts). Library fallback to JSON is a degraded path, not success criteria.
6. **Unsigned Linux AppImage** — Local/CI builds may be unsigned; expect desktop “untrusted” prompts depending on distro.
7. **Draft PR #21** — Keep draft until Jack’s AppImage checklist is recorded; this loop does not mark ready or merge.

---

## Manual AppImage regression checklist (Jack)

Build or download the Linux AppImage from this branch tip (e.g. `pnpm run build:electron` → `dist/electron/*.AppImage`, or CI PR artifact). Run from a clean user profile if possible.

Mark each item PASS / FAIL / SKIP with tip SHA and date.

### Preflight

- [ ] Tip SHA of the AppImage under test: _______________
- [ ] AppImage launches without immediate crash; Home becomes interactive

### Home

- [ ] Home shows brand/title **Poster** and primary Open Presentation control
- [ ] No bare “Open Present” CTA on Home (Present only from Deck)

### Library

- [ ] Save a deck to the library from Home/Deck
- [ ] Quit fully and relaunch AppImage — entry still listed
- [ ] Open entry into Deck; **Change...** library folder re-points without destroying the old folder

### Cold Present ×3

Repeat **three** cold opens (quit Present fully between attempts; prefer full app restart for at least one):

- [ ] Attempt 1: Open Present from Deck → leaves SSR `Loading...` → `present-ready` (client live)
- [ ] Attempt 2: same
- [ ] Attempt 3: same  
  **Pass rule:** 3/3 reach `present-ready` without stuck Loading. Record any flake.

### Import → Present → send (REQ-009) ×3

Repeat **three** cold runs (prefer full app restart between attempts):

- [ ] Attempt 1: Home **Import a file** → load deck → Open Present → Start/send → Present shows slide (not blank / not stuck Loading)
- [ ] Attempt 2: same
- [ ] Attempt 3: same  
  **Pass rule:** 3/3 succeed without flake. This is the tip `7c947cd` AppImage blocker.

### Directed-send

- [ ] With Present live, send a slide/payload to the selected Present only
- [ ] Present viewport shows the expected content (not blank / not stale other-child content)

### Message-only

- [ ] Send a message-only update (no full slide replace) to Present
- [ ] Message appears on Present without breaking session / forcing stuck Loading

### On Program

- [ ] After a successful send, Deck **On Program** thumbnail title/subtitle match Present
- [ ] **End** blanks Present and clears On Program thumbnail empty state
- [ ] **Start** resumes cleanly at slide 1 (or documented first-slide behavior)

### Theme

- [ ] Change theme on Home (e.g. Dracula)
- [ ] Fully quit AppImage and relaunch — theme restored before/at first paint

### Sign-off

- [ ] Overall AppImage verdict: READY / NOT READY  
- [ ] Notes / failures: _______________

---

## Related commands (operators)

```bash
# Local installer build (includes AppImage when configured)
pnpm install
pnpm rebuild better-sqlite3
pnpm run build:remix
pnpm run build:electron

# Automated Electron smoke (not AppImage proof)
CI=true ELECTRON_DISABLE_SANDBOX=1 xvfb-run -a pnpm run test:e2e:electron
```

See also: `README.md` (Electron installers), `electron-builder.yml`, `ralph/epic.md` (epic-006).
