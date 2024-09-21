import { useEffect, useState } from 'react';
import { connect } from './Broadcast/Broadcast';
import {
  PresentationEvent,
  Slide,
  VerticalAlign,
} from './Broadcast/PresentationEvent';

export default function Presentation() {
  const [loading, setLoading] = useState<boolean>(true);
  const [slide, setSlide] = useState<Slide | null | undefined>(null);
  const [message, setMessage] = useState<string | null | undefined>(null);
  const [useGreenScreen, setUseGreenScreen] = useState<
    boolean | null | undefined
  >(false);
  const root = document.getElementsByTagName('body');

  useEffect(() => {
    const socket = connect();
    socket.onmessage = event => {
      const present = event.data as PresentationEvent;
      console.log('Event Slide:', present.slide);
      setSlide(present.slide);
      setMessage(present.message);
      setUseGreenScreen(present.useGreenScreen);
    };

    setLoading(false);
  });

  useEffect(() => {
    if (useGreenScreen) root[0].style.backgroundColor = '#00b140';
    else root[0].style.backgroundColor = 'inherit';
  }, [useGreenScreen]);

  const display = loading ? (
    <h1>Loading...</h1>
  ) : (
    <div style={{ height: '100%', width: '100%' }}>
      <div id="message">{message}</div>
      <div
        id="slide"
        style={{
          height: '100%',
          width: '100%',
        }}
      >
        <div
          id="content"
          style={{
            backgroundColor: slide?.style.backgroundColor,
            color: slide?.style.color,
            position: 'absolute',
            bottom: '0px',
            width: slide?.style.width ?? '100%',
            height: slide?.style.height ?? '150px',
            verticalAlign:
              slide?.style.verticalAlign ?? VerticalAlign.MIDDLE.toString(),
            fontFamily: slide?.style.fontFamily,
            paddingTop: '20px',
          }}
        >
          <div
            style={{
              fontSize: slide?.style.title?.fontSize ?? slide?.style.fontSize,
            }}
          >
            {slide?.title}
          </div>
          <div
            style={{
              fontSize:
                slide?.style.subTitle?.fontSize ?? slide?.style.fontSize,
            }}
          >
            {slide?.subTitle}
          </div>
        </div>
      </div>
    </div>
  );
  return display;
}
