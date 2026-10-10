import React, { useLayoutEffect, useRef, useState } from 'react';
import type { ProgramThumbnailState } from '../../application/SessionTransport';
import { VerticalAlign } from '../../domain/PresentTypes';
import { SHOW_IMAGE_PICTURE_IN_GREEN_SCREEN } from '../../domain/greenScreenImagePicture';
import BackgroundImageLayer from '../shared/BackgroundImageLayer';
import PresentScaledStage from '../shared/PresentScaledStage';

export { SHOW_IMAGE_PICTURE_IN_GREEN_SCREEN };

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
  const isTitle = program?.slideType === 'title';
  const shellRef = useRef<HTMLDivElement | null>(null);
  // CSS max-width is 32rem (~512px); measure the shell so the Present stage fills it.
  const [previewWidth, setPreviewWidth] = useState(512);

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setPreviewWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasProgram, program?.slideType, program?.wholeBackground?.image]);

  const showImagePicture =
    !!program?.wholeBackground?.image &&
    program.slideType === 'image' &&
    !!(program.slideFile || program.slideStyle?.backgroundImage) &&
    (!isGreenScreen || SHOW_IMAGE_PICTURE_IN_GREEN_SCREEN);
  const imagePictureSrc = program?.slideFile || program?.slideStyle?.backgroundImage;

  const stageStyle: React.CSSProperties | undefined = program
    ? {
        display: 'flex',
        flexDirection: 'column',
        padding: lowerThird ? 0 : undefined,
        backgroundColor: isGreenScreen
          ? '#00b140'
          : program.backgroundColor || style?.backgroundColor || '#111',
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
        // Legacy CSS backgrounds stay off in green screen (pre-epic-005 look).
        backgroundImage:
          !program.wholeBackground?.image && !isGreenScreen && program.slideFile
            ? `url(${program.slideFile})`
            : !program.wholeBackground?.image && !isGreenScreen && style?.backgroundImage
              ? `url(${style.backgroundImage})`
              : undefined,
        backgroundSize: style?.backgroundSize ?? 'cover',
        backgroundPosition: style?.backgroundPosition ?? 'center',
        overflow: 'hidden',
      }
    : undefined;

  return (
    <div
      data-testid="program-thumbnail"
      className="deck-program-thumbnail"
      aria-label="Program thumbnail"
    >
      <h3>On program</h3>
      {hasProgram && program ? (
        <div
          ref={shellRef}
          data-testid="program-thumbnail-shell"
          className="deck-program-thumbnail-shell"
        >
          <PresentScaledStage
            testId="program-thumbnail-preview"
            stageTestId="program-thumbnail-present-frame"
            previewWidth={previewWidth}
            isTitleSlide={isTitle}
            className="deck-program-thumbnail-preview"
            stageStyle={stageStyle}
          >
            {program.wholeBackground?.image ? (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
              >
                <BackgroundImageLayer
                  resolved={program.wholeBackground}
                  testId="program-thumbnail-whole-bg"
                  zIndex={0}
                />
                {showImagePicture && imagePictureSrc ? (
                  <div
                    data-testid="program-thumbnail-image-picture"
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 1,
                      backgroundImage: `url(${imagePictureSrc})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      pointerEvents: 'none',
                    }}
                  />
                ) : null}
              </div>
            ) : null}
            {program.message ? (
              <div
                data-testid="program-thumbnail-message"
                className="deck-program-thumbnail-message"
                style={{ position: 'relative', zIndex: 2 }}
              >
                {program.message}
              </div>
            ) : null}

            {lowerThird && (hasTitleBlock || hasLines) ? (
              <div
                data-testid="program-thumbnail-lower-third"
                style={{ ...lowerThird, position: 'relative', zIndex: 2, overflow: 'hidden' }}
              >
                {program.titleTextBackground?.image ? (
                  <BackgroundImageLayer
                    resolved={program.titleTextBackground}
                    testId="program-thumbnail-title-text-bg"
                    zIndex={0}
                  />
                ) : null}
                {program.title ? (
                  <div
                    data-testid="program-thumbnail-title"
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      fontSize: program.titleFontSize ?? style?.fontSize,
                    }}
                  >
                    {program.title}
                  </div>
                ) : null}
                {program.subTitle ? (
                  <div
                    data-testid="program-thumbnail-subtitle"
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      fontSize: program.subTitleFontSize ?? style?.fontSize,
                    }}
                  >
                    {program.subTitle}
                  </div>
                ) : null}
                {hasLines ? (
                  <div data-testid="program-thumbnail-lines" style={{ position: 'relative', zIndex: 2 }}>
                    {program.lines!.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
                {program.titleTextBackground?.image ? (
                  <BackgroundImageLayer
                    resolved={program.titleTextBackground}
                    testId="program-thumbnail-title-text-bg"
                    zIndex={0}
                  />
                ) : null}
                {program.title ? (
                  <div
                    data-testid="program-thumbnail-title"
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      fontSize: program.titleFontSize ?? style?.fontSize,
                    }}
                  >
                    {program.title}
                  </div>
                ) : null}
                {program.subTitle ? (
                  <div
                    data-testid="program-thumbnail-subtitle"
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      fontSize: program.subTitleFontSize ?? style?.fontSize,
                    }}
                  >
                    {program.subTitle}
                  </div>
                ) : null}
                {hasLines ? (
                  <div data-testid="program-thumbnail-lines" style={{ position: 'relative', zIndex: 2 }}>
                    {program.lines!.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {!program.title &&
            !program.subTitle &&
            !program.message &&
            !hasLines ? (
              <div data-testid="program-thumbnail-empty-slide">Slide on program</div>
            ) : null}
          </PresentScaledStage>
        </div>
      ) : (
        <p data-testid="program-thumbnail-empty">Blank program output.</p>
      )}
    </div>
  );
}
