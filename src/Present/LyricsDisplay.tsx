import React from 'react';
import { SongData } from './PresentTypes';

export default function LyricsDisplay({
  song,
  segmentIndex,
}: {
  song?: SongData | null;
  segmentIndex: number;
}) {
  if (!song) return null;
  const lines = song.verses.flatMap(v => v.lines);
  const totalSegments = Math.max(1, Math.ceil(lines.length / 2));
  const seg = Math.max(0, Math.min(segmentIndex, totalSegments - 1));
  const first = lines[seg * 2] ?? '';
  const second = lines[seg * 2 + 1] ?? '';

  return (
    <div id="lyrics" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ fontSize: '48px', lineHeight: 1.1 }}>{first}</div>
      <div style={{ fontSize: '48px', lineHeight: 1.1 }}>{second}</div>
    </div>
  );
}
