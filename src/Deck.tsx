import { useEffect, useState } from 'react';
import { connect } from './Broadcast/Broadcast';
import {
  PresentationEvent,
  SlideDisplay,
  Slide,
  SlideContent,
  SlideType,
  SlideCSS,
  VerticalAlign,
} from './Broadcast/PresentationEvent';
export default function Deck() {
  const [socket, setSocket] = useState<BroadcastChannel | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSocket(connect());
    setMessage('Deck connected');
  }, []);

  useEffect(() => {
    if (socket) {
      socket.postMessage(new PresentationEvent(null, message));
    }
  }, [message]);

  const slideStyle = {
    backgroundColor: 'blue',
    verticalAlign: VerticalAlign.BOTTOM,
    color: 'white',
  } as SlideCSS;

  const deck: Slide[] = [
    {
      slideType: SlideType.TITLE,
      style: slideStyle,
      content: {
        title: 'Joseph Staples',
        subTitle: 'President, Willow Creek Stake',
      } as SlideContent,
    },
    {
      slideType: SlideType.TITLE,
      style: slideStyle,
      content: {
        title: 'Alan Mattheson',
        subTitle: 'First Counselor, Willow Creek Stake',
      } as SlideContent,
    },
  ];

  return (
    <>
      <h1>Deck</h1>
      <div>
        <h2>Slides</h2>
        <div id="slides">
          <ul>
            {deck.map((slide, index) => (
              <li key={index}>
                <SlideDisplay slide={slide} />
                <button
                  onClick={() =>
                    socket?.postMessage(new PresentationEvent(deck[index]))
                  }
                >
                  Send
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
