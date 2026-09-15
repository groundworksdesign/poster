import React from 'react';
import type { ProgramThumbnailState } from '../../application/SessionTransport';
import { VerticalAlign } from '../../domain/PresentTypes';

export type ProgramThumbnailPanelProps = {
  program: ProgramThumbnailState | null;
};

function flexAlignFromHorizontal(h?: string): React.CSSProperties['alignItems'] {
  if (h === 'left') return 'flex-start';
  if (h === 'right') return 'flex-end';
  return 'center';
}

/**
 * Present paints title/subtitle (and song intro / lyrics band) as a full-width
 * colored lower-third when green screen is on and the slide has a backgroundColor.
 * Mirror that chrome here so Deck "On Program" matches the Present output.
 */
function greenScreenLowerThirdStyle(
  program: ProgramThumbnailState,
): React.CSSProperties | null {
  if (!program.useGreenScreen) return null;
  const barColor = program.slideStyle?.backgroundColor;
  if (!barColor) return null;
  return {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: barColor,
    color: program.color || program.slideStyle?.color || '#fff',
    padding: '8px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: flexAlignFromHorizontal(program.slideStyle?.horizontalAlign),
    textAlign: (program.slideStyle?.horizontalAlign ?? 'center') as React.CSSProperties['textAlign'],
  };
}

function previewJustify(program: ProgramThumbnailState): React.CSSProperties['justifyContent'] {
  const v = program.slideStyle?.verticalAlign;
  if (v === VerticalAlign.TOP) return 'flex-start';
  if (v === VerticalAlign.BOTTOM) return 'flex-end';
  // Present middle (and unset) = centered overlay.
  return 'center';
}

/** Deck-side preview of what a Present child reports as on program. */
export function ProgramThumbnailPanel({ program }: ProgramThumbnailPanelProps) {
  const style = program?.slideStyle;
  const hasProgram = !!program;
  const isGreenScreen = !!program?.useGreenScreen;
  const lowerThird = program ? greenScreenLowerThirdStyle(program) : null;
  const hasTitleBlock = !!(program?.title || program?.subTitle);
  const hasLines = !!(program?.lines && program.lines.length > 0);

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
            position: 'relative',
            padding: lowerThird ? 0 : undefined,
            backgroundColor: isGreenScreen ? '#00b140' : (program.backgroundColor || style?.backgroundColor || '#111'),
            color: program.color || style?.color || '#fff',
            fontFamily: style?.fontFamily,
            fontSize: style?.fontSize,
            fontWeight: style?.fontWeight,
            textAlign: style?.horizontalAlign,
            alignItems: lowerThird
              ? 'stretch'
              : style?.horizontalAlign === 'left'
                ? 'flex-start'
                : style?.horizontalAlign === 'right'
                  ? 'flex-end'
                  : 'center',
            justifyContent: previewJustify(program),
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

          {lowerThird && (hasTitleBlock || hasLines) ? (
            <div data-testid="program-thumbnail-lower-third" style={lowerThird}>
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
              {hasLines ? (
                <div data-testid="program-thumbnail-lines">
                  {program.lines!.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <>
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
              {hasLines ? (
                <div data-testid="program-thumbnail-lines">
                  {program.lines!.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              ) : null}
            </>
          )}

          {!program.title &&
          !program.subTitle &&
          !program.message &&
          !hasLines ? (
            <div data-testid="program-thumbnail-empty-slide">Slide on program</div>
          ) : null}
        </div>
      ) : (
        <p data-testid="program-thumbnail-empty">Blank program output.</p>
      )}
    </div>
  );
}
