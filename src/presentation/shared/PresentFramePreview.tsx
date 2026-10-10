import React from 'react';
import type { BackgroundFit } from '../../domain/PresentTypes';
import {
  normalizeBackgroundDim,
  normalizeBackgroundFit,
  type ResolvedBackgroundImage,
} from '../../domain/backgroundImage';
import { presentFramePreviewScale } from '../../domain/presentFrame';
import BackgroundImageLayer from './BackgroundImageLayer';

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
  const { frame, scale, previewHeight } = presentFramePreviewScale(previewWidth, isTitleSlide);
  const resolved: ResolvedBackgroundImage = {
    image: image && image.trim() ? image.trim() : undefined,
    fit: normalizeBackgroundFit(fit),
    dim: normalizeBackgroundDim(dim),
    isOverride: false,
  };

  return (
    <div
      data-testid={testId}
      data-present-frame={isTitleSlide ? 'title' : 'non-title'}
      title="Embedded background preview"
      style={{
        width: previewWidth,
        height: previewHeight,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#111',
      }}
    >
      <div
        data-testid={`${testId}-frame`}
        style={{
          width: frame.width,
          height: frame.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
          backgroundColor: '#111',
        }}
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
      </div>
    </div>
  );
}
