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
    <div style={{ border: '1px solid #ccc', padding: '10px', margin: '5px' }}>
      <div><strong>{slide.title}</strong></div>
      {slide.subTitle && <div><em>{slide.subTitle}</em></div>}
      <div>Type: {slide.type}</div>
      {slide.lyrics && (
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          Verses: {slide.lyrics.verses.length}
        </div>
      )}
      <button 
        onClick={() => sendAction(props)}
        style={{ marginTop: '10px', padding: '5px 15px' }}
      >
        Send to Presentation
      </button>
    </div>
  );
}
