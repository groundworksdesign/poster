import { parseSongXML } from './songParser';

test('parse simple song xml with two verses', async () => {
  const xml = `<?xml version="1.0"?>
  <song>
    <title>Test Song</title>
    <author>Author Name</author>
    <verse number="1">
      <line>Line 1</line>
      <line>Line 2</line>
    </verse>
    <verse number="2">
      <line>Line 3</line>
    </verse>
  </song>`;

  const result = await parseSongXML(xml);
  expect(result.title).toBe('Test Song');
  expect(result.author).toBe('Author Name');
  expect(result.verses.length).toBe(2);
  expect(result.verses[0].lines[0]).toBe('Line 1');
  expect(result.verses[0].lines[1]).toBe('Line 2');
  expect(result.verses[1].lines[0]).toBe('Line 3');
});
