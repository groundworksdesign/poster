import type { LibrarySong, LibrarySongInput } from './librarySong';
import type { SongData, SongVerse } from './PresentTypes';
import { isSongData, parseSongXML } from './songParser';

/** One song parsed from an import file (not yet in the library). */
export type ImportCandidate = {
  key: string;
  title: string;
  book: string | null;
  number: string | null;
  author: string | null;
  verses: SongVerse[];
  hasLyrics: boolean;
};

export type TitleMatchInfo = {
  candidateKey: string;
  existingId: string;
  existingTitle: string;
  existingBook: string | null;
  existingNumber: string | null;
  /** Short lyrics / number display for the existing song. */
  existingLyricsPreview: string;
  /** Incoming song number + lyrics preview. */
  incomingNumber: string | null;
  incomingLyricsPreview: string;
};

export type NoLyricsAction = 'title_only' | 'skip';
export type TitleMatchAction = 'keep_both' | 'replace' | 'skip';

export type ImportReviewPlan = {
  fileName: string;
  candidates: ImportCandidate[];
  /** False for a single clean song (has lyrics, no title match) — skip the review screen. */
  needsReview: boolean;
  noLyricsKeys: string[];
  titleMatches: TitleMatchInfo[];
};

export type ImportSelections = {
  /** Checklist: keys checked for import. Default: all keys. */
  checkedKeys: string[];
  /** One choice for the whole no-lyrics group. */
  noLyricsAction: NoLyricsAction;
  /** Per title-match candidate key. */
  titleMatchActions: Record<string, TitleMatchAction>;
};

function versesHaveLyrics(verses: SongVerse[]): boolean {
  return verses.some(v => Array.isArray(v.lines) && v.lines.some(l => String(l).trim().length > 0));
}

function lyricsPreview(verses: SongVerse[], maxLines = 4): string {
  const lines = verses.flatMap(v => v.lines).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '(no lyrics)';
  return lines.slice(0, maxLines).join(' / ');
}

function normalizeVerses(raw: unknown): SongVerse[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v, index) => {
    if (!v || typeof v !== 'object') return { number: index + 1, lines: [] };
    const o = v as Record<string, unknown>;
    const number = typeof o.number === 'number' ? o.number : index + 1;
    const lines = Array.isArray(o.lines)
      ? o.lines.map(l => String(l))
      : typeof o.text === 'string'
        ? o.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        : [];
    return { number, lines };
  });
}

function versesFromLyricsField(lyrics: unknown): SongVerse[] {
  if (!lyrics) return [];
  if (typeof lyrics === 'string') {
    const blocks = lyrics
      .replace(/\r\n/g, '\n')
      .split(/\n\s*\n/)
      .map(b => b.trim())
      .filter(Boolean);
    if (blocks.length === 0) {
      const lines = lyrics.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      return lines.length ? [{ number: 1, lines }] : [];
    }
    return blocks.map((block, i) => ({
      number: i + 1,
      lines: block.split('\n').map(l => l.trim()).filter(Boolean),
    }));
  }
  if (Array.isArray(lyrics)) {
    if (lyrics.every(x => typeof x === 'string')) {
      const lines = (lyrics as string[]).map(l => l.trim()).filter(Boolean);
      return lines.length ? [{ number: 1, lines }] : [];
    }
    return normalizeVerses(lyrics);
  }
  if (typeof lyrics === 'object' && Array.isArray((lyrics as any).verses)) {
    return normalizeVerses((lyrics as any).verses);
  }
  return [];
}

function candidateFromObject(
  obj: Record<string, unknown>,
  index: number,
  defaultBook: string | null,
): ImportCandidate {
  const title =
    (typeof obj.title === 'string' && obj.title.trim()) ||
    (typeof obj.name === 'string' && obj.name.trim()) ||
    `Untitled ${index + 1}`;
  const book =
    (typeof obj.book === 'string' && obj.book.trim()) ||
    defaultBook;
  const numberRaw = obj.number ?? obj.num ?? obj.hymnNumber;
  const number =
    numberRaw === null || numberRaw === undefined || numberRaw === ''
      ? null
      : String(numberRaw);
  const author =
    typeof obj.author === 'string' && obj.author.trim() ? obj.author.trim() : null;

  let verses: SongVerse[] = [];
  if (Array.isArray(obj.verses)) {
    verses = normalizeVerses(obj.verses);
  } else if (obj.lyrics !== undefined) {
    verses = versesFromLyricsField(obj.lyrics);
  } else if (Array.isArray(obj.lines)) {
    verses = versesFromLyricsField(obj.lines);
  }

  const hasLyrics = versesHaveLyrics(verses);
  return {
    key: `song-${index}`,
    title,
    book,
    number,
    author,
    verses: hasLyrics ? verses : [],
    hasLyrics,
  };
}

/** Parse Poster song XML, allowing empty verses (no-lyrics import). */
export async function parseSongXmlForImport(xmlContent: string): Promise<SongData> {
  try {
    return await parseSongXML(xmlContent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/No verses found/i.test(message) && !/Failed to parse song XML: No verses/i.test(message)) {
      throw err;
    }
    // Minimal title extract for empty-lyric songs
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    if (xmlDoc.querySelector('parsererror')) throw err;
    const songElement = xmlDoc.querySelector('song') || xmlDoc.querySelector('Song');
    if (!songElement) throw err;
    const title =
      songElement.querySelector('title, Title')?.textContent?.trim() || 'Untitled';
    const author = songElement.querySelector('author, Author')?.textContent?.trim() || '';
    return { title, author, verses: [] };
  }
}

/**
 * Parse Doug's gathered book JSON, a song array, or a single Poster SongData JSON.
 */
export function parseGatheredOrSongJson(parsed: unknown, fileName: string): ImportCandidate[] {
  const defaultBookFromFile = fileName.replace(/\.[^.]+$/, '') || null;

  if (isSongData(parsed)) {
    const verses = parsed.verses;
    const hasLyrics = versesHaveLyrics(verses);
    return [
      {
        key: 'song-0',
        title: parsed.title,
        book: null,
        number: null,
        author: parsed.author ?? null,
        verses: hasLyrics ? verses : [],
        hasLyrics,
      },
    ];
  }

  // Title-only single song JSON (empty verses) — not isSongData
  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    typeof (parsed as any).title === 'string' &&
    Array.isArray((parsed as any).verses) &&
    !Array.isArray((parsed as any).slides) &&
    !Array.isArray((parsed as any).songs) &&
    !Array.isArray((parsed as any).hymns)
  ) {
    return [candidateFromObject(parsed as Record<string, unknown>, 0, null)];
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item, i) =>
      candidateFromObject(
        item && typeof item === 'object' ? (item as Record<string, unknown>) : { title: 'Untitled' },
        i,
        null,
      ),
    );
  }

  if (parsed && typeof parsed === 'object') {
    const root = parsed as Record<string, unknown>;
    const book =
      (typeof root.book === 'string' && root.book.trim()) ||
      (typeof root.name === 'string' && root.name.trim()) ||
      (typeof root.title === 'string' && root.title.trim()) ||
      defaultBookFromFile;
    const list = Array.isArray(root.songs)
      ? root.songs
      : Array.isArray(root.hymns)
        ? root.hymns
        : null;
    if (list) {
      return list.map((item, i) =>
        candidateFromObject(
          item && typeof item === 'object' ? (item as Record<string, unknown>) : { title: 'Untitled' },
          i,
          book,
        ),
      );
    }
  }

  throw new Error('Unrecognized song import JSON');
}

export async function parseImportFileContent(
  content: string,
  fileName: string,
): Promise<ImportCandidate[]> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.xml')) {
    const song = await parseSongXmlForImport(content);
    const hasLyrics = versesHaveLyrics(song.verses);
    return [
      {
        key: 'song-0',
        title: song.title,
        book: null,
        number: null,
        author: song.author ?? null,
        verses: hasLyrics ? song.verses : [],
        hasLyrics,
      },
    ];
  }
  if (lower.endsWith('.json')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('Invalid JSON');
    }
    return parseGatheredOrSongJson(parsed, fileName);
  }
  throw new Error('Unsupported file type. Use .json or .xml');
}

export function buildImportReviewPlan(
  candidates: ImportCandidate[],
  existingSongs: LibrarySong[],
  fileName = 'import',
): ImportReviewPlan {
  const byTitle = new Map<string, LibrarySong[]>();
  for (const song of existingSongs) {
    const key = song.title.trim().toLowerCase();
    const list = byTitle.get(key) ?? [];
    list.push(song);
    byTitle.set(key, list);
  }

  const noLyricsKeys = candidates.filter(c => !c.hasLyrics).map(c => c.key);
  const titleMatches: TitleMatchInfo[] = [];
  for (const c of candidates) {
    const matches = byTitle.get(c.title.trim().toLowerCase()) ?? [];
    // Use the first existing match for the prompt (keep both can still create a sibling).
    const existing = matches[0];
    if (!existing) continue;
    titleMatches.push({
      candidateKey: c.key,
      existingId: existing.id,
      existingTitle: existing.title,
      existingBook: existing.book,
      existingNumber: existing.number,
      existingLyricsPreview: lyricsPreview(existing.lyrics.verses),
      incomingNumber: c.number,
      incomingLyricsPreview: lyricsPreview(c.verses),
    });
  }

  const singleClean =
    candidates.length === 1 &&
    candidates[0].hasLyrics &&
    titleMatches.length === 0;

  return {
    fileName,
    candidates,
    needsReview: !singleClean,
    noLyricsKeys,
    titleMatches,
  };
}

export function defaultImportSelections(plan: ImportReviewPlan): ImportSelections {
  const titleMatchActions: Record<string, TitleMatchAction> = {};
  for (const m of plan.titleMatches) {
    titleMatchActions[m.candidateKey] = 'keep_both';
  }
  return {
    checkedKeys: plan.candidates.map(c => c.key),
    noLyricsAction: 'title_only',
    titleMatchActions,
  };
}

/**
 * Resolve checklist + problem-section choices into library upsert payloads.
 * Does not touch any open deck.
 */
export function resolveImportSelections(
  plan: ImportReviewPlan,
  selections: ImportSelections,
): LibrarySongInput[] {
  const checked = new Set(selections.checkedKeys);
  const matchByKey = new Map(plan.titleMatches.map(m => [m.candidateKey, m]));
  const out: LibrarySongInput[] = [];

  for (const c of plan.candidates) {
    if (!checked.has(c.key)) continue;

    if (!c.hasLyrics) {
      if (selections.noLyricsAction === 'skip') continue;
      // title_only
      out.push({
        title: c.title,
        book: c.book,
        number: c.number,
        author: c.author,
        lyrics: { title: c.title, author: c.author ?? undefined, verses: [] },
      });
      continue;
    }

    const match = matchByKey.get(c.key);
    const action = match
      ? selections.titleMatchActions[c.key] ?? 'keep_both'
      : 'keep_both';
    if (match && action === 'skip') continue;

    const payload: LibrarySongInput = {
      title: c.title,
      book: c.book,
      number: c.number,
      author: c.author,
      lyrics: {
        title: c.title,
        author: c.author ?? undefined,
        verses: c.verses,
      },
    };
    if (match && action === 'replace') {
      payload.id = match.existingId;
    }
    out.push(payload);
  }

  return out;
}
