import { applyPresentPayload } from './applyPresentPayload';
import { SlideType } from './PresentTypes';

function makeHandlers() {
  return {
    setSlide: jest.fn(),
    setMessage: jest.fn(),
    setUseGreenScreen: jest.fn(),
    setSongData: jest.fn(),
    setSegmentIndex: jest.fn(),
  };
}

describe('applyPresentPayload', () => {
  test('clears all presenter content for an explicit blank payload', () => {
    const handlers = makeHandlers();

    applyPresentPayload(
      { slide: null, message: null, useGreenScreen: false },
      handlers,
    );

    expect(handlers.setSlide).toHaveBeenCalledWith(null);
    expect(handlers.setMessage).toHaveBeenCalledWith(null);
    expect(handlers.setUseGreenScreen).toHaveBeenCalledWith(false);
    expect(handlers.setSongData).toHaveBeenCalledWith(null);
    expect(handlers.setSegmentIndex).toHaveBeenCalledWith(expect.any(Function));
  });

  test('keeps partial lyrics navigation independent from slide replacement', () => {
    const handlers = makeHandlers();

    applyPresentPayload(
      { data: { lyricsNavigation: { command: 'next' } } },
      handlers,
    );

    expect(handlers.setSegmentIndex).toHaveBeenCalledWith(expect.any(Function));
    expect(handlers.setSlide).not.toHaveBeenCalled();
    expect(handlers.setMessage).not.toHaveBeenCalled();
  });

  test('continues applying a non-blank slide payload', () => {
    const handlers = makeHandlers();
    const slide = {
      type: SlideType.TITLE,
      title: 'Title',
      style: { backgroundColor: '#000', color: '#fff' },
    };

    applyPresentPayload({ slide, message: 'Live', useGreenScreen: true }, handlers);

    expect(handlers.setSlide).toHaveBeenCalledWith(slide);
    expect(handlers.setMessage).toHaveBeenCalledWith('Live');
    expect(handlers.setUseGreenScreen).toHaveBeenCalledWith(true);
    expect(handlers.setSongData).toHaveBeenCalledWith(null);
  });
});
