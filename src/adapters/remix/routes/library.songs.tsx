import { Outlet } from '@remix-run/react';

export { loader } from '../server/library.songs.loader.server';

/**
 * Layout for /library/songs*: manage UI is `library.songs._index`; add/import
 * are sibling routes. Listing JSON stays on this route's loader
 * (`REMIX_ROUTE_ID.librarySongs`) so `?_data` fetches keep working.
 * Loader implementation lives in `../server/` (not under `routes/`).
 */
export default function SongLibraryLayout() {
  return <Outlet />;
}
