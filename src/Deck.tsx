import React, { ChangeEvent, useEffect, useState } from 'react';
import { connect } from './Broadcast/Broadcast';
import {
  PresentationEvent,
  PresentationEventProps,
  SlideDisplay,
  SlideCSS,
  Slide,
  VerticalAlign,
  PresentationData,
  SlideType,
} from './Broadcast/PresentationEvent';

export default function Deck() {
  const [socket, setSocket] = useState<BroadcastChannel | null>(null);
  const [message, setMessage] = useState<string | null>();
  const [file, setFile] = useState<File>();
  const [presentation, setPresentation] = useState<PresentationData>();
  const [deck, setDeck] = useState<Slide[]>([]);

  useEffect(() => {
    setSocket(connect());
    setMessage('Deck connected');
  }, []);

  useEffect(() => {
    if (socket) {
      socket.postMessage(
        new PresentationEvent({
          slide: null,
          message: message,
          useGreenScreen: false,
        }),
      );
    }
  }, [message]);

  const slideStyle = {
    backgroundColor: 'blue',
    verticalAlign: VerticalAlign.BOTTOM,
    color: 'white',
  } as SlideCSS;

  // const file = fs.readFileSync(
  //   '/Users/hpractv/temp/stake_conference/Willow Creek 2024 Stake Conference.mqe',
  //   'utf-8',
  // );

  // const deck: Slide[] = [
  //   {
  //     slideType: SlideType.TITLE,
  //     style: slideStyle,
  //     content: {
  //       title: 'Joseph Staples',
  //       subTitle: 'President, Willow Creek Stake',
  //     } as SlideContent,
  //   },
  //   {
  //     slideType: SlideType.TITLE,
  //     style: slideStyle,
  //     content: {
  //       title: 'Alan Mattheson',
  //       subTitle: 'First Counselor, Willow Creek Stake',
  //     } as SlideContent,
  //   },
  // ];

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setPresentation(JSON.parse(text) as PresentationData);
      if ((presentation?.deck.length ?? 0) > 0) {
        console.log(presentation?.deck);
        setDeck(presentation?.deck || []);
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <h1>Deck</h1>
      <div>
        <input type="file" onChange={handleFileChange} />
        <div>{file && `${file.name} - ${file.type}`}</div>
        <button onClick={handleUploadClick}>Upload</button>
      </div>
      <div>
        <h2>Slides</h2>
        <div id="slides">
          <ul>
            {deck.map((slide, index) => {
              const style = {
                ...presentation?.slideStyles[SlideType.GENERAL.toString()],
                ...presentation?.slideStyles[slide.type.toString()],
              };
              const props = {
                slide: { ...deck[index], style: style },
                useGreenScreen: true,
              } as PresentationEventProps;

              console.log('Props: ', props);

              return (
                <li key={index}>
                  <SlideDisplay slide={slide} />
                  <button
                    onClick={() =>
                      socket?.postMessage(new PresentationEvent(props))
                    }
                  >
                    Send
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
