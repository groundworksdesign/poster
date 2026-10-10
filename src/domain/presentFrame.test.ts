import {
  NON_TITLE_PROGRAM_HEIGHT_RATIO,
  PRESENT_VIEWPORT,
  presentFramePreviewScale,
  presentSlideFrameSize,
} from './presentFrame';

describe('presentFrame', () => {
  it('title frame is the full Present viewport', () => {
    expect(presentSlideFrameSize(true)).toEqual(PRESENT_VIEWPORT);
  });

  it('non-title frame uses the Present band height ratio', () => {
    const frame = presentSlideFrameSize(false);
    expect(frame.width).toBe(PRESENT_VIEWPORT.width);
    expect(frame.height).toBe(Math.round(PRESENT_VIEWPORT.height * NON_TITLE_PROGRAM_HEIGHT_RATIO));
  });

  it('preview scale preserves Present aspect so fit letterbox matches', () => {
    const { frame, scale, previewHeight } = presentFramePreviewScale(160, false);
    expect(scale).toBeCloseTo(160 / frame.width);
    expect(previewHeight / 160).toBeCloseTo(frame.height / frame.width);
  });
});
