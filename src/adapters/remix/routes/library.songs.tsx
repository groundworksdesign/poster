import { json } from '@remix-run/node';
import type { LoaderFunction } from '@remix-run/node';
import { findSongs, listSongs, usageCountsForSongs } from '../../persistence/songs.server';
import SongLibraryPage from '../../../presentation/SongLibrary/SongLibraryPage';

function serializeSong(
  song: ReturnType<typeof listSongs>[number],
  usedInDeckCount?: number,
) {
  return {
    id: song.id,
    title: song.title,
    book: song.book,
    number: song.number,
    author: song.author,
    lyrics: song.lyrics,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
    ...(usedInDeckCount !== undefined ? { usedInDeckCount } : {}),
  };
}

/**
 * GET /library/songs — local song library listing.
 * Optional `?q=` filters by title, book, number, or lyrics (AC-002 findability).
 * Optional `?usage=1` adds usedInDeckCount per song (manage page / Pam).
 * Fresh installs return [] (AC-001 / REQ-001); church books are not bundled.
 */
export const loader: LoaderFunction = ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const withUsage = url.searchParams.get('usage') === '1';
  const songs = q != null && q !== '' ? findSongs(q) : listSongs();
  if (!withUsage) {
    return json(songs.map(s => serializeSong(s)));
  }
  const counts = usageCountsForSongs(songs.map(s => s.id));
  return json(songs.map(s => serializeSong(s, counts[s.id] ?? 0)));
};

/** Manage library page (REQ-021 / AC-017). `_data` fetches still receive loader JSON. */
export default SongLibraryPage;
