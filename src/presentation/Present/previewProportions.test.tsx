/**
 * Text-to-slide proportion: preview must match Present.
 *
 * Previews lay out at Present's logical frame size with Present font sizes,
 * then CSS-scale the whole stage. That keeps text box height/width relative
 * to the slide identical (within tolerance) to Present.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { VerticalAlign, HorizontalAlign, SlideType } from '../../domain/PresentTypes';
import {
  PRESENT_VIEWPORT,
  presentSlideFrameSize,
} from '../../domain/presentFrame';
import { ProgramThumbnailPanel } from '../Deck/ProgramThumbnailPanel';
import PresentScaledStage from '../shared/PresentScaledStage';

const TOLERANCE = 0.02;

type Ratio = { heightRatio: number; widthRatio: number };

function parsePx(value: string | null | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Visual (post-scale) text-to-slide ratios from logical stage + font metrics.
 * jsdom does not lay out text; we derive ratios the same way a CSS scale does:
 * both text and slide shrink by the same scale factor, so ratios equal
 * logicalText / logicalSlide.
 */
function ratiosFromStage(stage: HTMLElement, text: HTMLElement): Ratio {
  const slideW = parsePx(stage.getAttribute('data-frame-width') || stage.style.width);
  const slideH = parsePx(stage.getAttribute('data-frame-height') || stage.style.height);
  const fontSize = parsePx(getComputedStyle(text).fontSize || text.style.fontSize);
  const textContent = (text.textContent || '').trim();
  // Approximate single-line text box: height = fontSize, width = glyph advance.
  const textH = fontSize;
  const textW = Math.min(slideW, Math.max(fontSize, textContent.length * fontSize * 0.55));
  return {
    heightRatio: textH / slideH,
    widthRatio: textW / slideW,
  };
}

/** Present reference at the same logical frame the preview uses. */
function PresentRatioFixture({
  isTitleSlide,
  title,
  titleFontSize,
  slideType,
}: {
  isTitleSlide: boolean;
  title: string;
  titleFontSize: string;
  slideType: 'title' | 'song' | 'general';
}) {
  const frame = presentSlideFrameSize(isTitleSlide);
  return (
    <div
      data-testid="present-ratio-stage"
      data-frame-width={frame.width}
      data-frame-height={frame.height}
      style={{
        width: frame.width,
        height: frame.height,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div
        data-testid="present-ratio-title"
        data-slide-type={slideType}
        style={{ fontSize: titleFontSize }}
      >
        {title}
      </div>
    </div>
  );
}

function expectRatiosClose(preview: Ratio, present: Ratio) {
  expect(preview.heightRatio).toBeGreaterThan(0);
  expect(present.heightRatio).toBeGreaterThan(0);
  expect(Math.abs(preview.heightRatio - present.heightRatio)).toBeLessThanOrEqual(TOLERANCE);
  expect(Math.abs(preview.widthRatio - present.widthRatio)).toBeLessThanOrEqual(TOLERANCE);
}

function stubPreviewWidth(width: number) {
  const originalRO = (global as any).ResizeObserver;
  (global as any).ResizeObserver = class {
    cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    observe(el: Element) {
      Object.defineProperty(el, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
          width,
          height: Math.round((PRESENT_VIEWPORT.height * width) / PRESENT_VIEWPORT.width),
          top: 0,
          left: 0,
          bottom: 0,
          right: width,
          x: 0,
          y: 0,
          toJSON() {},
        }),
      });
      this.cb([{ target: el } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  };
  return () => {
    (global as any).ResizeObserver = originalRO;
  };
}

describe('preview text-to-slide proportions vs Present', () => {
  it('title slide: preview ratios match Present within tolerance', () => {
    const restore = stubPreviewWidth(320);
    const title = 'Stake Conference';
    const titleFontSize = '48px';

    render(
      <>
        <PresentRatioFixture
          isTitleSlide
          title={title}
          titleFontSize={titleFontSize}
          slideType="title"
        />
        <ProgramThumbnailPanel
          program={{
            title,
            titleFontSize,
            slideType: 'title',
            slideStyle: {
              color: '#fff',
              verticalAlign: VerticalAlign.MIDDLE,
              horizontalAlign: HorizontalAlign.CENTER,
            },
            backgroundColor: '#111',
            color: '#fff',
            useGreenScreen: false,
          }}
        />
      </>,
    );

    const present = ratiosFromStage(
      screen.getByTestId('present-ratio-stage'),
      screen.getByTestId('present-ratio-title'),
    );
    const preview = ratiosFromStage(
      screen.getByTestId('program-thumbnail-present-frame'),
      screen.getByTestId('program-thumbnail-title'),
    );
    expectRatiosClose(preview, present);
    // Whole stage is scaled (not font-size alone).
    expect(Number(screen.getByTestId('program-thumbnail-present-frame').getAttribute('data-frame-scale'))).toBeCloseTo(
      320 / PRESENT_VIEWPORT.width,
      5,
    );
    restore();
  });

  it('song slide: preview ratios match Present within tolerance', () => {
    const restore = stubPreviewWidth(400);
    const title = 'Amazing Grace';
    const titleFontSize = '36px';
    const frame = presentSlideFrameSize(false);

    render(
      <>
        <PresentRatioFixture
          isTitleSlide={false}
          title={title}
          titleFontSize={titleFontSize}
          slideType="song"
        />
        <PresentScaledStage
          testId="song-slide-preview"
          previewWidth={400}
          isTitleSlide={false}
          stageStyle={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: titleFontSize,
          }}
        >
          <div data-testid="song-slide-preview-title" style={{ fontSize: titleFontSize }}>
            {title}
          </div>
        </PresentScaledStage>
        <ProgramThumbnailPanel
          program={{
            title,
            titleFontSize,
            slideType: 'song',
            slideStyle: { color: '#fff', fontSize: titleFontSize },
            backgroundColor: '#111',
            color: '#fff',
            useGreenScreen: false,
          }}
        />
      </>,
    );

    const present = ratiosFromStage(
      screen.getByTestId('present-ratio-stage'),
      screen.getByTestId('present-ratio-title'),
    );
    const slidePreview = ratiosFromStage(
      screen.getByTestId('song-slide-preview-stage'),
      screen.getByTestId('song-slide-preview-title'),
    );
    const thumb = ratiosFromStage(
      screen.getByTestId('program-thumbnail-present-frame'),
      screen.getByTestId('program-thumbnail-title'),
    );
    expectRatiosClose(slidePreview, present);
    expectRatiosClose(thumb, present);
    expect(screen.getByTestId('song-slide-preview-stage')).toHaveAttribute(
      'data-frame-height',
      String(frame.height),
    );
    // Prove bug class is fixed: 36px is not relative to the small 400px box alone.
    expect(present.heightRatio).toBeCloseTo(36 / frame.height, 5);
    restore();
  });

  it('general slide: preview ratios match Present within tolerance', () => {
    const restore = stubPreviewWidth(256);
    const title = 'Announcements';
    const titleFontSize = '40px';
    const frame = presentSlideFrameSize(false);

    render(
      <>
        <PresentRatioFixture
          isTitleSlide={false}
          title={title}
          titleFontSize={titleFontSize}
          slideType="general"
        />
        <ProgramThumbnailPanel
          program={{
            title,
            titleFontSize,
            slideType: SlideType.GENERAL,
            slideStyle: { color: '#fff', fontSize: titleFontSize },
            backgroundColor: '#222',
            color: '#fff',
            useGreenScreen: false,
          }}
        />
      </>,
    );

    const present = ratiosFromStage(
      screen.getByTestId('present-ratio-stage'),
      screen.getByTestId('present-ratio-title'),
    );
    const preview = ratiosFromStage(
      screen.getByTestId('program-thumbnail-present-frame'),
      screen.getByTestId('program-thumbnail-title'),
    );
    expectRatiosClose(preview, present);
    expect(preview.heightRatio).toBeCloseTo(40 / frame.height, 5);
    restore();
  });
});
