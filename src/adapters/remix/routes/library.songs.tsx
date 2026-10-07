import { Outlet } from '@remix-run/react';

export { loader } from './library.songs.loader.server';

/**
 * Layout for /library/songs*: manage UI is `library.songs._index`; add/import
 * are sibling routes. Listing JSON stays on this route's loader
 * (`REMIX_ROUTE_ID.librarySongs`) so `?_data` fetches keep working.
 */
export default function SongLibraryLayout() {
  return <Outlet />;
}
