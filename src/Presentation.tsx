import { useEffect, useState } from 'react';
import { connect } from './Broadcast/Broadcast';
import {
  PresentationEvent,
  Slide,
  SlideContent,
} from './Broadcast/PresentationEvent';

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
    };
    setLoading(false);
  });

  const display = loading ? (
    <h1>Loading...</h1>
  ) : (
    <>
      <div id="message">{message}</div>
      <div id="slide">
        <div id="content">
          <div>{slide?.content.title}</div>
          <div>{slide?.content.subTitle}</div>
        </div>
      </div>
    </>
  );
  return display;
}
