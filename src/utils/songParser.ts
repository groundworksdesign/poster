import { SongData, SongVerse, SlideType } from '../Present/PresentTypes';

export const parseSongXML = async (xmlContent: string): Promise<SongData> => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid XML format');
    }
    
    const songElement = xmlDoc.querySelector('song');
    if (!songElement) {
      throw new Error('Invalid song XML format: missing song element');
    }

    const titleElement = songElement.querySelector('title');
    const authorElement = songElement.querySelector('author');
    
    const title = titleElement?.textContent?.trim() || 'Untitled';
    const author = authorElement?.textContent?.trim() || '';
    
    const verses: SongVerse[] = [];
    
    // Try the current nested format first: <verses><verse>...</verse></verses>
    let verseElements = songElement.querySelectorAll('verses verse');
    
    // If no verses found with nested format, try direct verse elements: <song><verse>...</verse></song>
    if (verseElements.length === 0) {
      verseElements = songElement.querySelectorAll(':scope > verse');
    }
    
    verseElements.forEach((verseElement, index) => {
      const verseNumber = parseInt(verseElement.getAttribute('number') || '') || index + 1;
      const lineElements = verseElement.querySelectorAll('line');
      const lines: string[] = [];
      
      lineElements.forEach(lineElement => {
        const lineText = lineElement.textContent?.trim();
        if (lineText) {
          lines.push(lineText);
        }
      });
      
      verses.push({
        number: verseNumber,
        lines,
      });
    });
    
    if (verses.length === 0) {
      throw new Error('No verses found in song XML');
    }
    
    return {
      title,
      author,
      verses,
    };
  } catch (error) {
    throw new Error(`Failed to parse song XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
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