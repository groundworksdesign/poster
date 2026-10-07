# Iris gate FAIL — PR #26 @ 15ee17d

- **PR:** https://github.com/groundworksdesign/poster/pull/26
- **Head at fail:** `15ee17d0c8b523d0f34b9b6d31ed9bde7f0784ef`
- **Branch:** `cursor/epic-004-song-library`
- **Epic:** epic-004 song library (fix pass; keep prior QA `passes:true` on completed todos)
- **Fix-pass budget:** 14 Ralph loops (planning → dev → QA per task)
- **Do not merge.** Present/ and `stagedSongSlide.ts` stay byte-identical to `main`. Out of scope unchanged: bundling church books, copyrighted lyrics, two-line staging changes, replacing the open deck on import. Leave Add slide > SONG opening the chooser (blank-song-slide pending Roy).

## BLOCKER — Remix flat-route nesting (runtime)

**Fails at runtime (prod `server.js`, Electron, AppImage, portable):** `/library/songs`, `/library/songs/add`, `/library/songs/import` all render `Library (coming soon)`.

**Cause (verified in tree):** Remix v2 flat routes nest `routes/library.songs*.tsx` under `routes/library.tsx`. Parent default export is:

```tsx
export default function LibraryPage() {
  return <div>Library (coming soon)</div>;
}
```

No `<Outlet/>` / `useOutlet()`. Child `library.songs` default is `SongLibraryPage` with no `<Outlet/>`, so `library.songs.add` / `.import` never surface either. Unit tests that render presentation components in isolation miss this.

**Suggested fix:**

1. `library.tsx` — render `useOutlet() ??` coming-soon div (keep presentation-library loader).
2. `library.songs.tsx` — loader + `<Outlet/>` layout only.
3. Move manage UI to `library.songs._index.tsx` (or equivalent `_`-suffixed flat names) exporting `SongLibraryPage`.
4. Keep `?_data` loaders/actions working; update `REMIX_ROUTE_ID` in `remixDataUrl.ts` if route ids change.
5. Add **real-app Remix e2e** (Playwright remix config, against **production build**) for:
   - Home → Song library → Add, Import, and Edit (assert real UI, not coming-soon / not href-only)
   - Open library from Add-song-slide chooser library link (assert real manage UI)

**ACs blocked at runtime:** AC-002, AC-004, AC-005, AC-006, AC-010, AC-013, AC-015, AC-017, AC-018 (and related REQs for hand-add / import / library page / linked updates).

## ALSO FIX

### 1. Add-song-slide import skips review (REQ-005/006/018/019/022)

`AddSongSlideChooser.confirmImport` POSTs `/library/songs/save` directly for the chosen candidate. It skips no-lyrics and title-match prompts and can silently save duplicate titles. Must use the same import review screen (`ImportSongsReview` / review plan) as library import. Keep **AC-007**: insert after selection without replacing the open deck. Keep Also-save checkbox behavior (AC-009/014) consistent with review outcomes.

### 2. JSON restore wipes songs when backup has no `songs` key

`replaceLibraryFromJsonText` in `library-json.server.ts` does `songs = Array.isArray(file.songs) ? file.songs : []`, then `writeAll({ presentations, songs })`. Pre-epic-004 backups without `songs` clear the song library. **Fix:** when backup has no `songs` section, keep existing on-disk songs. Add a unit/integration test.

### 3. Client `ReferenceError: process is not defined` on `/library/songs`

Browser console error on song library routes. Remove client-side `process` usage (do not pull Node-only modules into the client bundle). E2E must assert no page errors on song-library navigation.

### 4. Flaky unit test — used song edit Apply

`SongLibraryPage.unit.test.tsx` — `REQ-012/023: used song edit shows deck checkboxes; apply calls apply-decks` fails ~2/8 runs (`applies.length` 0). Root cause: Apply stays busy-disabled while `fetchSongs` runs after `setDeckPrompt` (busy held across refresh). Fix: wait for Apply enabled in test and/or do not hold `busy` across `fetchSongs` after showing the prompt. **QA:** run that test **10× in isolation**, all green.

## Final QA bar (after all fix tasks pass)

- `pnpm exec tsc --noEmit` clean
- Full Jest green
- `pnpm run build:remix`
- Remix e2e including new song-library specs (prod build)
- Electron e2e
- Final commit/push **without** CI-skip marker so PR CI runs; update PR body (title/body must not contain the CI-skip token). Do not merge.

## Fix task order (risk / unblock)

1. `fix-remix-song-library-outlets` — blocker; unlocks real runtime for all library ACs + e2e harness
2. `fix-add-slide-import-review` — review path from chooser
3. `fix-json-restore-preserve-songs` — data loss on restore
4. `fix-client-process-reference` — console error + e2e pageerror guard
5. `fix-song-library-apply-flake` — flake before final CI

Selected first: **fix-remix-song-library-outlets**.
