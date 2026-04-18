import React from 'react';
import { SongData, HorizontalAlign, VerticalAlign } from './PresentTypes';

function justifyFromVertical(v?: VerticalAlign): React.CSSProperties['justifyContent'] {
  if (v === VerticalAlign.TOP) return 'flex-start';
  if (v === VerticalAlign.BOTTOM) return 'flex-end';
  return 'center';
}

function alignFromHorizontal(h?: HorizontalAlign): React.CSSProperties['alignItems'] {
  if (h === HorizontalAlign.LEFT) return 'flex-start';
  if (h === HorizontalAlign.RIGHT) return 'flex-end';
  return 'center';
}

function textAlignFromHorizontal(h?: HorizontalAlign): React.CSSProperties['textAlign'] {
  if (h === HorizontalAlign.LEFT) return 'left';
  if (h === HorizontalAlign.RIGHT) return 'right';
  return 'center';
}

export default function LyricsDisplay({
  song,
  segmentIndex,
  horizontalAlign,
  verticalAlign,
  fillHeight,
}: {
  song?: SongData | null;
  segmentIndex: number;
  horizontalAlign?: HorizontalAlign;
  verticalAlign?: VerticalAlign;
  /** When true, stretch to parent height so vertical alignment has room to move. */
  fillHeight?: boolean;
}) {
  if (!song) return null;
  const lines = song.verses.flatMap(v => v.lines);
  const totalSegments = Math.max(1, Math.ceil(lines.length / 2));
  const seg = Math.max(0, Math.min(segmentIndex, totalSegments - 1));
  const first = lines[seg * 2] ?? '';
  const second = lines[seg * 2 + 1] ?? '';

  const h = horizontalAlign;
  const v = verticalAlign;
  const lineStyle: React.CSSProperties = {
    fontSize: '48px',
    lineHeight: 1.1,
    maxWidth: '100%',
    boxSizing: 'border-box',
    paddingLeft: 0,
    paddingRight: 0,
    textAlign: textAlignFromHorizontal(h),
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  };

  return (
    <div
      id="lyrics"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: alignFromHorizontal(h),
        justifyContent: justifyFromVertical(v),
        height: fillHeight ? '100%' : undefined,
        flex: fillHeight ? 1 : undefined,
        minHeight: fillHeight ? 0 : undefined,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div style={lineStyle}>{first}</div>
      <div style={lineStyle}>{second}</div>
    </div>
  );
}
