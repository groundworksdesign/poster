import {
  Deck,
  Slide,
  SlideType,
  PresentDataProps,
} from '../../domain/PresentTypes';
import { resolveSlideStyle } from '../../domain/resolveSlideStyle';

export default function SlideDisplay({
  deck,
  slide,
  sendAction,
}: {
  deck: Deck;
  slide: Slide;
  sendAction: (props: PresentDataProps) => void;
}) {
  const effectiveStyle = resolveSlideStyle(deck, slide);
  const props = {
    slide: { ...slide, style: effectiveStyle },
    useGreenScreen: deck?.useGreenScreen,
  } as PresentDataProps;

  return (
    <div>
      <div>{slide.title} </div>
      <div> {slide.subTitle} </div>
      <button onClick={() => sendAction(props)}>Send</button>
    </div>
  );
}
