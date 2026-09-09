import React from 'react';
import type { ProgramThumbnailState } from '../Present/SessionTransport';

export type ProgramThumbnailPanelProps = {
  program: ProgramThumbnailState | null;
};

/** Deck-side preview of what a Present child reports as on program. */
export function ProgramThumbnailPanel({ program }: ProgramThumbnailPanelProps) {
  const style = program?.slideStyle;
  const hasProgram = !!program;
  const isGreenScreen = !!program?.useGreenScreen;

  return (
    <div
      data-testid="program-thumbnail"
      className="deck-program-thumbnail"
      aria-label="Program thumbnail"
    >
      <h3>On program</h3>
      {hasProgram ? (
        <div
          data-testid="program-thumbnail-preview"
          className="deck-program-thumbnail-preview"
          style={{
            backgroundColor: isGreenScreen ? '#00b140' : (program.backgroundColor || style?.backgroundColor || '#111'),
            color: program.color || style?.color || '#fff',
            fontFamily: style?.fontFamily,
            fontSize: style?.fontSize,
            fontWeight: style?.fontWeight,
            textAlign: style?.horizontalAlign,
            alignItems:
              style?.horizontalAlign === 'left'
                ? 'flex-start'
                : style?.horizontalAlign === 'right'
                  ? 'flex-end'
                  : 'center',
            justifyContent:
              style?.verticalAlign === 'top'
                ? 'flex-start'
                : style?.verticalAlign === 'bottom'
                  ? 'flex-end'
                  : 'center',
            backgroundImage:
              !isGreenScreen && program.slideFile
                ? `url(${program.slideFile})`
                : !isGreenScreen && style?.backgroundImage
                  ? `url(${style.backgroundImage})`
                  : undefined,
            backgroundSize: style?.backgroundSize ?? 'cover',
            backgroundPosition: style?.backgroundPosition ?? 'center',
          }}
        >
          {program.message ? (
            <div data-testid="program-thumbnail-message" className="deck-program-thumbnail-message">
              {program.message}
            </div>
          ) : null}
          {program.title ? (
            <div
              data-testid="program-thumbnail-title"
              style={{ fontSize: program.titleFontSize ?? style?.fontSize }}
            >
              {program.title}
            </div>
          ) : null}
          {program.subTitle ? (
            <div
              data-testid="program-thumbnail-subtitle"
              style={{ fontSize: program.subTitleFontSize ?? style?.fontSize }}
            >
              {program.subTitle}
            </div>
          ) : null}
          {program.lines && program.lines.length > 0 ? (
            <div data-testid="program-thumbnail-lines">
              {program.lines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          ) : null}
          {!program.title &&
          !program.subTitle &&
          !program.message &&
          !(program.lines && program.lines.length) ? (
            <div data-testid="program-thumbnail-empty-slide">Slide on program</div>
          ) : null}
        </div>
      ) : (
        <p data-testid="program-thumbnail-empty">Blank program output.</p>
      )}
    </div>
  );
}
