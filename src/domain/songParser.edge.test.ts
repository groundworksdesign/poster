import { parseSongXML } from './songParser';

test('throws on missing song element', async () => {
  const xml = `<?xml version="1.0"?><root></root>`;
  await expect(parseSongXML(xml)).rejects.toThrow(/missing song element/i);
});

test('parses plain text verses under Lyrics/Verse', async () => {
  const xml = `<?xml version="1.0"?>
<song>
  <title>Plain Song</title>
  <Lyrics>
    <Verse label="PlainText">1. First line
2. Second line
3. Third line</Verse>
  </Lyrics>
</song>`;
  const result = await parseSongXML(xml);
  expect(result.title).toBe('Plain Song');
  expect(result.verses.length).toBeGreaterThan(0);
  expect(result.verses[0].lines[0]).toBe('First line');
});

test('missing title defaults to Untitled', async () => {
  const xml = `<?xml version="1.0"?><song><verse number="1"><line>Only line</line></verse></song>`;
  const result = await parseSongXML(xml);
  expect(result.title).toBe('Untitled');
  expect(result.verses[0].lines[0]).toBe('Only line');
});
