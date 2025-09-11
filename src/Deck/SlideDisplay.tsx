import {
  Deck,
  Slide,
  SlideType,
  PresentDataProps,
} from '../Present/PresentTypes';

export default function SlideDisplay({
  deck,
  slide,
  sendAction,
}: {
  deck: Deck;
  slide: Slide;
  sendAction: (props: PresentDataProps) => void;
}) {
  const style = {
    ...deck?.slideStyles[SlideType.GENERAL.toString()],
    ...deck?.slideStyles[slide.type.toString()],
  };
  const props = {
    slide: { ...slide, style: style },
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
