# Feedback

## fix-remix-song-library-outlets DEV (fix loop 2 / epic loop 22)

Implemented Remix outlet nesting + prod-build song-library e2e. `passes:false` (QA owns passes).

### Changes

- `library.tsx`: `useOutlet() ??` coming-soon; loader moved to `library.loader.server.ts`
- `library.songs.tsx`: `<Outlet/>` layout; loader moved to `library.songs.loader.server.ts`
- Manage UI: `library.songs._index.tsx` → `SongLibraryPage`
- `REMIX_ROUTE_ID.librarySongs` unchanged for `?_data`; added `librarySongsIndex`
- E2E: `tests/e2e/remix-song-library.spec.ts` against `server.js` production build

### Validation

- `tsc --noEmit` exit 0
- Prod Remix e2e song-library: 2 passed
