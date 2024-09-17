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
  const fileReader = new FileReader();

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

  useEffect(() => {
    if (presentation) {
      setDeck(presentation?.deck || []);
    }
  }, [presentation]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    if (!file) {
      return;
    }

    fileReader.addEventListener('load', () => {
      const presentationJson = fileReader.result as string;
      console.log('presentationJson:', presentationJson);
      setPresentation(JSON.parse(presentationJson) as PresentationData);
    });

    fileReader.readAsText(file);
    console.log('fr called.');
  };

  return (
    <>
      <h1>Deck</h1>
      <div>
        <input
          type="file"
          onChange={handleFileChange}
          style={{ width: '400px', border: '1px solid black' }}
        />
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
                useGreenScreen: presentation?.useGreenScreen,
              } as PresentationEventProps;
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
