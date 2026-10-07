import { json } from '@remix-run/node';
import type { LoaderFunction } from '@remix-run/node';
import { findSongs, listSongs } from '../../persistence/songs.server';

function serializeSong(song: ReturnType<typeof listSongs>[number]) {
  return {
    id: song.id,
    title: song.title,
    book: song.book,
    number: song.number,
    author: song.author,
    lyrics: song.lyrics,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
  };
}

/**
 * GET /library/songs — local song library listing.
 * Optional `?q=` filters by title, book, number, or lyrics (AC-002 findability).
 * Fresh installs return [] (AC-001 / REQ-001); church books are not bundled.
 */
export const loader: LoaderFunction = ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const songs = (q != null && q !== '' ? findSongs(q) : listSongs()).map(serializeSong);
  return json(songs);
};

export default function SongLibraryApi() {
  return null;
}
