import { remixDataUrl, REMIX_ROUTE_ID } from './remixDataUrl';

describe('remixDataUrl', () => {
  it('appends _data for Remix JSON loader/action requests', () => {
    expect(remixDataUrl('/library', REMIX_ROUTE_ID.library)).toBe(
      '/library?_data=routes%2Flibrary',
    );
    expect(remixDataUrl('/library/open/abc-1', REMIX_ROUTE_ID.libraryOpen)).toBe(
      '/library/open/abc-1?_data=routes%2Flibrary.open.%24id',
    );
  });
});
