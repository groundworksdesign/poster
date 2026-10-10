import React from 'react';
import type { BackgroundFit } from '../../domain/PresentTypes';
import {
  normalizeBackgroundDim,
  normalizeBackgroundFit,
  type ResolvedBackgroundImage,
} from '../../domain/backgroundImage';
import BackgroundImageLayer from './BackgroundImageLayer';
import PresentScaledStage from './PresentScaledStage';

export type PresentFramePreviewProps = {
  image?: string;
  fit?: BackgroundFit | string;
  dim?: number;
  isTitleSlide?: boolean;
  /** Preview box width in CSS px. Height follows Present frame aspect. */
  previewWidth?: number;
  testId: string;
  /** Optional fitted image-slide picture on top (contain). */
  pictureSrc?: string;
  showPicture?: boolean;
};

/**
 * Renders a background (and optional image picture) inside a scaled Present
 * slide frame so tile density and fit letterbox bars match Present.
 */
export default function PresentFramePreview({
  image,
  fit,
  dim,
  isTitleSlide = false,
  previewWidth = 160,
  testId,
  pictureSrc,
  showPicture = false,
}: PresentFramePreviewProps) {
  const resolved: ResolvedBackgroundImage = {
    image: image && image.trim() ? image.trim() : undefined,
    fit: normalizeBackgroundFit(fit),
    dim: normalizeBackgroundDim(dim),
    isOverride: false,
  };

  return (
    <PresentScaledStage
      testId={testId}
      stageTestId={`${testId}-frame`}
      previewWidth={previewWidth}
      isTitleSlide={isTitleSlide}
      style={{ backgroundColor: '#111' }}
      stageStyle={{ backgroundColor: '#111' }}
    >
      <BackgroundImageLayer resolved={resolved} testId={`${testId}-layer`} zIndex={0} />
      {showPicture && pictureSrc ? (
        <div
          data-testid={`${testId}-picture`}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            backgroundImage: `url(${pictureSrc})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </PresentScaledStage>
  );
}
