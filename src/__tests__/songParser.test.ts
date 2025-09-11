import { parseSongXML, createSongSlide } from '../utils/songParser';
import { SlideType } from '../Present/PresentTypes';

describe('Song XML Parser', () => {
  const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<song>
  <title>Amazing Grace</title>
  <author>John Newton</author>
  <verses>
    <verse number="1">
      <line>Amazing grace, how sweet the sound</line>
      <line>That saved a wretch like me</line>
      <line>I once was lost, but now I'm found</line>
      <line>Was blind, but now I see</line>
    </verse>
    <verse number="2">
      <line>'Twas grace that taught my heart to fear</line>
      <line>And grace my fears relieved</line>
      <line>How precious did that grace appear</line>
      <line>The hour I first believed</line>
    </verse>
  </verses>
</song>`;

  test('should parse valid XML song data correctly', async () => {
    const result = await parseSongXML(sampleXML);
    
    expect(result.title).toBe('Amazing Grace');
    expect(result.author).toBe('John Newton');
    expect(result.verses).toHaveLength(2);
    
    expect(result.verses[0].number).toBe(1);
    expect(result.verses[0].lines).toHaveLength(4);
    expect(result.verses[0].lines[0]).toBe('Amazing grace, how sweet the sound');
    
    expect(result.verses[1].number).toBe(2);
    expect(result.verses[1].lines[0]).toBe('\'Twas grace that taught my heart to fear');
  });

  test('should create proper slide structure', async () => {
    const songData = await parseSongXML(sampleXML);
    const style = { backgroundColor: '#000', color: '#fff' };
    const slide = createSongSlide(songData, style);
    
    expect(slide.type).toBe(SlideType.SONG);
    expect(slide.title).toBe('Amazing Grace');
    expect(slide.subTitle).toBe('by John Newton');
    expect(slide.lyrics).toEqual(songData);
    expect(slide.style).toEqual(style);
  });

  test('should handle XML without author', async () => {
    const xmlWithoutAuthor = `<?xml version="1.0" encoding="UTF-8"?>
<song>
  <title>Test Song</title>
  <verses>
    <verse number="1">
      <line>Test line 1</line>
      <line>Test line 2</line>
    </verse>
  </verses>
</song>`;
    
    const result = await parseSongXML(xmlWithoutAuthor);
    expect(result.title).toBe('Test Song');
    expect(result.author).toBe('');
    
    const slide = createSongSlide(result, {});
    expect(slide.subTitle).toBeUndefined();
  });

  test('should throw error for invalid XML', async () => {
    const invalidXML = 'not valid xml';
    await expect(parseSongXML(invalidXML)).rejects.toThrow('Failed to parse song XML');
  });

  test('should throw error for XML without song element', async () => {
    const xmlWithoutSong = '<?xml version="1.0"?><root><title>Test</title></root>';
    await expect(parseSongXML(xmlWithoutSong)).rejects.toThrow('missing song element');
  });
});