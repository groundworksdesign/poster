/**
 * Remix serves HTML for navigation-style requests to routes that have a default component.
 * Client-side `fetch()` must use the `_data` query param so loaders/actions return JSON.
 * Route ids match `src/adapters/remix/routes/*` in the Remix manifest (e.g. `routes/library`).
 */
export const REMIX_ROUTE_ID = {
  library: 'routes/library',
  libraryOpen: 'routes/library.open.$id',
  libraryDelete: 'routes/library.delete.$id',
  librarySave: 'routes/library.save',
  libraryRestore: 'routes/library.restore',
  librarySettings: 'routes/library.settings',
  librarySongs: 'routes/library.songs',
  librarySongsSave: 'routes/library.songs.save',
  librarySongsAdd: 'routes/library.songs.add',
  librarySongsImport: 'routes/library.songs.import',
} as const;

export function remixDataUrl(path: string, routeId: string): string {
  const url = new URL(path, 'http://_');
  url.searchParams.set('_data', routeId);
  return url.pathname + url.search;
}
