import { SongData, SongVerse, SlideType } from './PresentTypes';

export const parseSongXML = async (xmlContent: string): Promise<SongData> => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) throw new Error('Invalid XML format');

    // Support both legacy <song> and new capitalized <Song>
    let songElement =
      xmlDoc.querySelector('song') || xmlDoc.querySelector('Song');
    if (!songElement)
      throw new Error('Invalid song XML format: missing song element');

    const titleElement = songElement.querySelector('title, Title');
    const authorElement = songElement.querySelector('author, Author');
    const title = titleElement?.textContent?.trim() || 'Untitled';
    const author = authorElement?.textContent?.trim() || '';

    const verses: SongVerse[] = [];

    // First try legacy structured verses (<verses><verse number><line/></verse></verses>)
    let legacyVerseElements = songElement.querySelectorAll('verses verse');
    if (legacyVerseElements.length === 0)
      legacyVerseElements = songElement.querySelectorAll(':scope > verse');

    if (legacyVerseElements.length > 0) {
      legacyVerseElements.forEach((verseElement, index) => {
        const verseNumber =
          parseInt(verseElement.getAttribute('number') || '') || index + 1;
        const lineElements = verseElement.querySelectorAll('line');
        const lines: string[] = [];
        lineElements.forEach(lineElement => {
          const lineText = lineElement.textContent?.trim();
          if (lineText) lines.push(lineText);
        });
        if (lines.length) verses.push({ number: verseNumber, lines });
      });
    }

    // If still no verses, attempt new PlainText block under <Lyrics><Verse label="PlainText">...</Verse></Lyrics>
    if (verses.length === 0) {
      const lyricsRoot = songElement.querySelector('Lyrics');
      if (lyricsRoot) {
        const verseBlocks = lyricsRoot.querySelectorAll('Verse');
        verseBlocks.forEach(vb => {
          const raw = vb.textContent || '';
          const linesRaw = raw.split(/\r?\n/).map(l => l.trim());
          let currentVerseNumber: number | null = null;
          let currentLines: string[] = [];
          const commitVerse = () => {
            if (currentLines.length) {
              verses.push({
                number: currentVerseNumber || verses.length + 1,
                lines: currentLines.slice(),
              });
            }
            currentLines = [];
          };
          linesRaw.forEach(line => {
            if (!line) return; // skip blanks
            const match = line.match(/^(\d+)\.(.*)$/);
            if (match) {
              // starting new numbered verse
              commitVerse();
              currentVerseNumber = parseInt(match[1], 10);
              const rest = match[2].trim();
              if (rest) currentLines.push(rest);
              return;
            }
            // treat Chorus: as just another line under current verse (or last verse)
            currentLines.push(line);
          });
          commitVerse();
        });
      }
    }

    if (verses.length === 0) throw new Error('No verses found in song XML');

    return { title, author, verses };
  } catch (error) {
    throw new Error(
      `Failed to parse song XML: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
};

export const createSongSlide = (songData: SongData, existingStyle: any) => {
  return {
    type: SlideType.SONG,
    title: songData.title,
    subTitle: songData.author ? `by ${songData.author}` : undefined,
    file: undefined,
    style: existingStyle,
    lyrics: songData,
  };
};

export const isSongData = (obj: unknown): obj is SongData => {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.title !== 'string' || !o.title) return false;
  if (!Array.isArray(o.verses) || o.verses.length === 0) return false;
  if (!Array.isArray((o.verses[0] as any)?.lines)) return false;
  // A Deck has a `slides` array -- exclude it so we don't misclassify a deck
  if (Array.isArray(o.slides)) return false;
  return true;
};

// NEW: create slides showing 2 lines at a time across all verses
export const createSongSlides = (songData: SongData, existingStyle: any) => {
  const allLines: { verse: number; text: string }[] = [];
  songData.verses.forEach(v =>
    v.lines.forEach(l => allLines.push({ verse: v.number, text: l })),
  );
  const slides: any[] = [];
  for (let i = 0; i < allLines.length; i += 2) {
    const segment = allLines.slice(i, i + 2);
    slides.push({
      id: `song-${i / 2}`,
      type: SlideType.SONG,
      title: songData.title,
      subTitle: songData.author || undefined,
      style: existingStyle,
      lines: segment.map(s => s.text),
      firstVerse: segment[0].verse,
      lastVerse: segment[segment.length - 1].verse,
      segmentIndex: i / 2,
      totalSegments: Math.ceil(allLines.length / 2),
    });
  }
  return slides;
};
