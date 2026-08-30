/**
 * Remix serves HTML for navigation-style requests to routes that have a default component.
 * Client-side `fetch()` must use the `_data` query param so loaders/actions return JSON.
 * Route ids match `app/routes/*` in the Remix manifest (e.g. `routes/library`).
 */
export const REMIX_ROUTE_ID = {
  library: 'routes/library',
  libraryOpen: 'routes/library.open.$id',
  libraryDelete: 'routes/library.delete.$id',
  librarySave: 'routes/library.save',
  libraryRestore: 'routes/library.restore',
} as const;

export function remixDataUrl(path: string, routeId: string): string {
  const url = new URL(path, 'http://_');
  url.searchParams.set('_data', routeId);
  return url.pathname + url.search;
}
