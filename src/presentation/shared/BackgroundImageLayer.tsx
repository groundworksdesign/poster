import React from 'react';
import {
  backgroundFitToCss,
  type ResolvedBackgroundImage,
} from '../../domain/backgroundImage';

export type BackgroundImageLayerProps = {
  resolved: ResolvedBackgroundImage;
  /** test id prefix, e.g. present-whole-bg */
  testId: string;
  /** z-index for the image layer (dim sits at zIndex+1). */
  zIndex?: number;
  /** When false, render nothing (caller may use legacy CSS background). */
  enabled?: boolean;
};

/**
 * Absolute-fill background image with fit mode and dim-toward-black overlay.
 */
export default function BackgroundImageLayer({
  resolved,
  testId,
  zIndex = 0,
  enabled = true,
}: BackgroundImageLayerProps) {
  if (!enabled || !resolved.image) return null;
  const fitCss = backgroundFitToCss(resolved.fit);
  return (
    <>
      <div
        data-testid={testId}
        data-fit={resolved.fit}
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex,
          backgroundImage: `url(${resolved.image})`,
          backgroundSize: fitCss.backgroundSize,
          backgroundRepeat: fitCss.backgroundRepeat,
          backgroundPosition: fitCss.backgroundPosition,
          pointerEvents: 'none',
        }}
      />
      {resolved.dim > 0 ? (
        <div
          data-testid={`${testId}-dim`}
          data-dim={String(resolved.dim)}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: zIndex + 1,
            backgroundColor: `rgba(0,0,0,${resolved.dim})`,
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </>
  );
}
