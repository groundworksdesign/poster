import { remixDataUrl, REMIX_ROUTE_ID } from './remixDataUrl';

describe('remixDataUrl', () => {
  it('appends _data for Remix JSON loader/action requests', () => {
    expect(remixDataUrl('/library', REMIX_ROUTE_ID.library)).toBe(
      '/library?_data=routes%2Flibrary',
    );
    expect(remixDataUrl('/library/open/abc-1', REMIX_ROUTE_ID.libraryOpen)).toBe(
      '/library/open/abc-1?_data=routes%2Flibrary.open.%24id',
    );
    expect(remixDataUrl('/library/songs/delete/s1', REMIX_ROUTE_ID.librarySongsDelete)).toBe(
      '/library/songs/delete/s1?_data=routes%2Flibrary.songs.delete.%24id',
    );
    expect(remixDataUrl('/library/songs/s1/decks', REMIX_ROUTE_ID.librarySongsDecks)).toBe(
      '/library/songs/s1/decks?_data=routes%2Flibrary.songs.%24id.decks',
    );
    expect(
      remixDataUrl('/library/songs/s1/apply-decks', REMIX_ROUTE_ID.librarySongsApplyDecks),
    ).toBe('/library/songs/s1/apply-decks?_data=routes%2Flibrary.songs.%24id.apply-decks');
  });
});
