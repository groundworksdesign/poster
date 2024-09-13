import { useEffect, useState } from 'react';
import { connect } from './Broadcast/Broadcast';
import {
  PresentationEvent,
  Slide,
  SlideContent,
  VerticalAlign,
} from './Broadcast/PresentationEvent';
import './presentation.css';

export default function Presentation() {
  const [loading, setLoading] = useState<boolean>(true);
  const [slide, setSlide] = useState<Slide | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const socket = connect();
    socket.onmessage = event => {
      const present = event.data as PresentationEvent;
      setSlide(present.slide);
      setMessage(present.message);
      console.log('Slide: ', present.slide);
    };
    setLoading(false);
  });

  const display = loading ? (
    <h1>Loading...</h1>
  ) : (
    <>
      <div id="message">{message}</div>
      <div id="slide">
        <div
          id="content"
          style={{
            backgroundColor: slide?.style.backgroundColor,
            color: slide?.style.color,
            position: 'absolute',
            bottom: '0px',
            width: slide?.style.width ?? '100%',
            height: slide?.style.height ?? '150px',
            verticalAlign: slide?.style.verticalAlign ?? VerticalAlign.MIDDLE,
          }}
        >
          <div className="title">{slide?.content.title}</div>
          <div className="subtitle">{slide?.content.subTitle}</div>
        </div>
      </div>
    </>
  );
  return display;
}
