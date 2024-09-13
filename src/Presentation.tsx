import { useEffect, useState } from 'react';
import { connect } from './Broadcast/Broadcast';
import {
  PresentationEvent,
  Slide,
  SlideContent,
} from './Broadcast/PresentationEvent';

export default function Presentation() {
  const [slide, setSlide] = useState<Slide | null>(null);

  useEffect(() => {
    const socket = connect();
    socket.onmessage = event => {
      const present = event.data as PresentationEvent;
      setSlide(present.slide);
      console.log('slide', slide);
    };
  });

  const display =
    slide == null ? (
      <>
        <div id="message">Wating for message...</div>
      </>
    ) : (
      <>
        <div id="message">
          <div>{slide.content.title}</div>
          <div>{slide.content.subTitle}</div>
        </div>
      </>
    );

  return display;
}
