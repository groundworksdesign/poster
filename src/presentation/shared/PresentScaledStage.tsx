import React from 'react';
import { presentFramePreviewScale } from '../../domain/presentFrame';

export type PresentScaledStageProps = {
  /** Visible preview box width in CSS px. */
  previewWidth: number;
  /** Title slides use the full Present viewport; others use the non-title band. */
  isTitleSlide?: boolean;
  /** testid for the outer (scaled) preview box. */
  testId: string;
  /** testid for the logical Present-sized stage (default `${testId}-stage`). */
  stageTestId?: string;
  className?: string;
  /** Styles on the outer clipped preview box. */
  style?: React.CSSProperties;
  /** Styles on the logical Present stage (fonts, flex, backgrounds). */
  stageStyle?: React.CSSProperties;
  children?: React.ReactNode;
};

/**
 * Renders children at Present's logical slide size, then CSS-scales the whole
 * stage into the preview box so text, backgrounds, tile/fit, and layout keep
 * Present's proportions.
 */
export default function PresentScaledStage({
  previewWidth,
  isTitleSlide = false,
  testId,
  stageTestId,
  className,
  style,
  stageStyle,
  children,
}: PresentScaledStageProps) {
  const { frame, scale, previewHeight } = presentFramePreviewScale(previewWidth, isTitleSlide);
  const resolvedStageTestId = stageTestId ?? `${testId}-stage`;

  return (
    <div
      data-testid={testId}
      data-present-frame={isTitleSlide ? 'title' : 'non-title'}
      data-preview-width={previewWidth}
      className={className}
      style={{
        width: previewWidth,
        height: previewHeight,
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      <div
        data-testid={resolvedStageTestId}
        data-frame-scale={scale}
        data-frame-width={frame.width}
        data-frame-height={frame.height}
        style={{
          width: frame.width,
          height: frame.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
          boxSizing: 'border-box',
          ...stageStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
