import fs from 'fs';
import path from 'path';
import type { Deck, SongData } from '../../domain/PresentTypes';
import type { LibrarySong, LibrarySongInput } from '../../domain/librarySong';
import { libraryPaths } from './library-root.server';

export let jsonLibraryPath = libraryPaths().json;

export function setLibraryJsonPath(root: string): void {
  jsonLibraryPath = path.join(root, 'poster.library.json');
}

export type LibraryListEntry = {
  id: string;
  title: string;
  date: string | null;
  location: string | null;
  created_at: string;
};

interface StoredPresentation {
  id: string;
  title: string;
  date: string | null;
  location: string | null;
  notes: string | null;
  use_green_screen: number;
  deck_json: string;
  created_at: string;
  updated_at: string;
}

interface StoredSong {
  id: string;
  title: string;
  book: string | null;
  number: string | null;
  author: string | null;
  song_json: string;
  created_at: string;
  updated_at: string;
}

interface JsonLibraryFile {
  presentations: StoredPresentation[];
  /** Song library; absent or empty on fresh installs (no bundled church books). */
  songs?: StoredSong[];
}

function emptyLibrary(): JsonLibraryFile {
  return { presentations: [], songs: [] };
}

function readAll(): JsonLibraryFile {
  if (!fs.existsSync(jsonLibraryPath)) return emptyLibrary();
  try {
    const data = JSON.parse(fs.readFileSync(jsonLibraryPath, 'utf8')) as JsonLibraryFile;
    if (!Array.isArray(data.presentations)) return emptyLibrary();
    return {
      presentations: data.presentations,
      songs: Array.isArray(data.songs) ? data.songs : [],
    };
  } catch {
    return emptyLibrary();
  }
}

function generateId(): string {
  return typeof (globalThis as any).crypto !== 'undefined' &&
    typeof (globalThis as any).crypto.randomUUID === 'function'
    ? (globalThis as any).crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseLyrics(songJson: string): SongData {
  try {
    const parsed = JSON.parse(songJson) as SongData;
    if (!parsed || typeof parsed !== 'object') return { title: '', verses: [] };
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      author: typeof parsed.author === 'string' ? parsed.author : undefined,
      verses: Array.isArray(parsed.verses) ? parsed.verses : [],
    };
  } catch {
    return { title: '', verses: [] };
  }
}

function storedSongToLibrarySong(row: StoredSong): LibrarySong {
  return {
    id: row.id,
    title: row.title,
    book: row.book ?? null,
    number: row.number ?? null,
    author: row.author ?? null,
    lyrics: parseLyrics(row.song_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function writeAll(data: JsonLibraryFile) {
  const dir = path.dirname(jsonLibraryPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.poster-library-${process.pid}-${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, jsonLibraryPath);
}

export function jsonLibraryList(): LibraryListEntry[] {
  const { presentations } = readAll();
  return presentations
    .map(p => ({
      id: p.id,
      title: p.title,
      date: p.date,
      location: p.location,
      created_at: p.created_at,
    }))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function jsonLibraryGetDeckJson(id: string): string | null {
  const { presentations } = readAll();
  const row = presentations.find(p => p.id === id);
  return row ? row.deck_json : null;
}

export function jsonLibraryUpsert(body: Deck & { id?: string }): string {
  const now = new Date().toISOString();
  const data = readAll();
  const providedId = body.id && typeof body.id === 'string' && body.id.length > 0 ? body.id : null;
  const deckJson = JSON.stringify(body);

  if (providedId) {
    const idx = data.presentations.findIndex(p => p.id === providedId);
    if (idx >= 0) {
      const prev = data.presentations[idx];
      data.presentations[idx] = {
        ...prev,
        title: body.title ?? '',
        date: body.date ?? null,
        location: body.location ?? null,
        notes: body.notes ?? null,
        use_green_screen: body.useGreenScreen ? 1 : 0,
        deck_json: deckJson,
        updated_at: now,
      };
      writeAll(data);
      return providedId;
    }
  }

  const id =
    typeof (globalThis as any).crypto !== 'undefined' && typeof (globalThis as any).crypto.randomUUID === 'function'
      ? (globalThis as any).crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

  data.presentations.push({
    id,
    title: body.title ?? '',
    date: body.date ?? null,
    location: body.location ?? null,
    notes: body.notes ?? null,
    use_green_screen: body.useGreenScreen ? 1 : 0,
    deck_json: deckJson,
    created_at: now,
    updated_at: now,
  });
  writeAll(data);
  return id;
}

export function jsonLibraryDelete(id: string): boolean {
  const data = readAll();
  const before = data.presentations.length;
  data.presentations = data.presentations.filter(p => p.id !== id);
  if (data.presentations.length === before) return false;
  writeAll(data);
  return true;
}

/** Replace the on-disk JSON library (e.g. restore). */
export function replaceLibraryFromJsonText(text: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as JsonLibraryFile).presentations)) {
    throw new Error('Invalid library file: expected { presentations: [...] }');
  }
  const file = parsed as JsonLibraryFile;
  for (const p of file.presentations) {
    if (!p || typeof p !== 'object' || typeof (p as StoredPresentation).id !== 'string') {
      throw new Error('Invalid presentation row');
    }
    if (typeof (p as StoredPresentation).deck_json !== 'string') {
      throw new Error('Invalid presentation row: deck_json');
    }
  }
  const songs = Array.isArray(file.songs) ? file.songs : [];
  for (const s of songs) {
    if (!s || typeof s !== 'object' || typeof (s as StoredSong).id !== 'string') {
      throw new Error('Invalid song row');
    }
    if (typeof (s as StoredSong).song_json !== 'string') {
      throw new Error('Invalid song row: song_json');
    }
  }
  writeAll({ presentations: file.presentations, songs });
}

/** Fresh JSON library has zero songs (AC-001). */
export function jsonLibraryListSongs(): LibrarySong[] {
  const { songs = [] } = readAll();
  return songs
    .map(storedSongToLibrarySong)
    .sort((a, b) => {
      const titleCmp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      if (titleCmp !== 0) return titleCmp;
      return (a.number ?? '').localeCompare(b.number ?? '', undefined, { sensitivity: 'base' });
    });
}

export function jsonLibraryGetSong(id: string): LibrarySong | null {
  const { songs = [] } = readAll();
  const row = songs.find(s => s.id === id);
  return row ? storedSongToLibrarySong(row) : null;
}

export function jsonLibraryUpsertSong(body: LibrarySongInput): string {
  const now = new Date().toISOString();
  const data = readAll();
  if (!Array.isArray(data.songs)) data.songs = [];
  const title = body.title?.trim() || 'Untitled';
  const book = body.book ?? null;
  const number = body.number ?? null;
  const author = body.author ?? null;
  const lyrics: SongData = {
    title: body.lyrics?.title?.trim() || title,
    author: body.lyrics?.author ?? author ?? undefined,
    verses: Array.isArray(body.lyrics?.verses) ? body.lyrics.verses : [],
  };
  const songJson = JSON.stringify(lyrics);
  const providedId =
    body.id && typeof body.id === 'string' && body.id.length > 0 ? body.id : null;

  if (providedId) {
    const idx = data.songs.findIndex(s => s.id === providedId);
    if (idx >= 0) {
      const prev = data.songs[idx];
      data.songs[idx] = {
        ...prev,
        title,
        book,
        number,
        author,
        song_json: songJson,
        updated_at: now,
      };
      writeAll(data);
      return providedId;
    }
  }

  const id = providedId ?? generateId();
  data.songs.push({
    id,
    title,
    book,
    number,
    author,
    song_json: songJson,
    created_at: now,
    updated_at: now,
  });
  writeAll(data);
  return id;
}
