import { applyPresentPayload } from './applyPresentPayload';
import { SlideType } from './PresentTypes';

function makeHandlers() {
  return {
    setSlide: jest.fn(),
    setMessage: jest.fn(),
    setUseGreenScreen: jest.fn(),
    setSongData: jest.fn(),
    setSegmentIndex: jest.fn(),
    setDefaultBackground: jest.fn(),
    setDefaultTitleTextBackground: jest.fn(),
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

  test('applies message-only payloads without treating missing slide as blank', () => {
    const handlers = makeHandlers();

    applyPresentPayload({ message: 'Operator note', useGreenScreen: true }, handlers);

    expect(handlers.setMessage).toHaveBeenCalledWith('Operator note');
    expect(handlers.setUseGreenScreen).toHaveBeenCalledWith(true);
    expect(handlers.setSlide).not.toHaveBeenCalled();
    expect(handlers.setSongData).not.toHaveBeenCalled();
  });

  test('applies clear-message without wiping the current slide', () => {
    const handlers = makeHandlers();

    applyPresentPayload({ message: '', useGreenScreen: false }, handlers);

    expect(handlers.setMessage).toHaveBeenCalledWith('');
    expect(handlers.setSlide).not.toHaveBeenCalled();
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

  test('applies deck background defaults on slide send', () => {
    const handlers = makeHandlers();
    const slide = {
      type: SlideType.GENERAL,
      title: 'G',
      style: {},
    };
    const defaultBackground = { image: 'data:image/png;base64,x', fit: 'fill' as const, dim: 0.2 };
    const defaultTitleTextBackground = { image: 'data:image/png;base64,y', fit: 'fit' as const };

    applyPresentPayload(
      { slide, defaultBackground, defaultTitleTextBackground, useGreenScreen: false },
      handlers,
    );

    expect(handlers.setDefaultBackground).toHaveBeenCalledWith(defaultBackground);
    expect(handlers.setDefaultTitleTextBackground).toHaveBeenCalledWith(defaultTitleTextBackground);
  });

  test('explicit null background defaults clear Present state (LIVE-CLEAR / LIVE-OLDDECK)', () => {
    const handlers = makeHandlers();
    const slide = {
      type: SlideType.GENERAL,
      title: 'Legacy',
      style: { backgroundColor: '#336699' },
    };

    applyPresentPayload(
      {
        slide,
        defaultBackground: null,
        defaultTitleTextBackground: null,
        useGreenScreen: false,
      },
      handlers,
    );

    expect(handlers.setDefaultBackground).toHaveBeenCalledWith(undefined);
    expect(handlers.setDefaultTitleTextBackground).toHaveBeenCalledWith(undefined);
  });
});


