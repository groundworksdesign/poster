import { json } from '@remix-run/node';
import type { LoaderFunction } from '@remix-run/node';
import { listSongs } from '../../persistence/songs.server';

/**
 * GET /library/songs — local song library listing.
 * Fresh installs return [] (AC-001 / REQ-001); church books are not bundled.
 */
export const loader: LoaderFunction = () => {
  const songs = listSongs().map(song => ({
    id: song.id,
    title: song.title,
    book: song.book,
    number: song.number,
    author: song.author,
    lyrics: song.lyrics,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
  }));
  return json(songs);
};

export default function SongLibraryApi() {
  return null;
}
