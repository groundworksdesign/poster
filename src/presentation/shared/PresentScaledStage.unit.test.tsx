import React from 'react';
import { render, screen } from '@testing-library/react';
import { PRESENT_VIEWPORT, presentSlideFrameSize } from '../../domain/presentFrame';
import PresentScaledStage from './PresentScaledStage';

describe('PresentScaledStage', () => {
  it('renders a Present-sized stage and CSS-scales it into the preview box', () => {
    render(
      <PresentScaledStage testId="scaled" previewWidth={320} isTitleSlide>
        <div data-testid="scaled-child">Hello</div>
      </PresentScaledStage>,
    );

    const outer = screen.getByTestId('scaled');
    expect(outer).toHaveAttribute('data-present-frame', 'title');
    expect(outer).toHaveAttribute('data-preview-width', '320');
    expect(outer).toHaveStyle({
      width: '320px',
      height: `${Math.round(PRESENT_VIEWPORT.height * (320 / PRESENT_VIEWPORT.width))}px`,
    });

    const stage = screen.getByTestId('scaled-stage');
    expect(stage).toHaveAttribute('data-frame-width', String(PRESENT_VIEWPORT.width));
    expect(stage).toHaveAttribute('data-frame-height', String(PRESENT_VIEWPORT.height));
    expect(Number(stage.getAttribute('data-frame-scale'))).toBeCloseTo(320 / 1280, 5);
    expect(stage).toHaveStyle({
      width: `${PRESENT_VIEWPORT.width}px`,
      height: `${PRESENT_VIEWPORT.height}px`,
      transform: `scale(${320 / 1280})`,
      transformOrigin: 'top left',
    });
    expect(stage).toContainElement(screen.getByTestId('scaled-child'));
  });

  it('uses the non-title Present band for non-title slides', () => {
    const frame = presentSlideFrameSize(false);
    render(
      <PresentScaledStage testId="scaled" previewWidth={160} isTitleSlide={false}>
        <span>Song</span>
      </PresentScaledStage>,
    );
    const stage = screen.getByTestId('scaled-stage');
    expect(stage).toHaveAttribute('data-frame-width', String(frame.width));
    expect(stage).toHaveAttribute('data-frame-height', String(frame.height));
    expect(screen.getByTestId('scaled')).toHaveAttribute('data-present-frame', 'non-title');
  });
});
