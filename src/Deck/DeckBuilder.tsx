import React, { ChangeEvent, useEffect, useState } from 'react';
import { connect, ChannelType, Connection } from '../Present/Broadcast';
import SlideDisplay from './SlideDisplay';
import {
  PresentData,
  PresentDataProps,
  SlideCSS,
  Slide,
  VerticalAlign,
  Deck,
  SlideType,
} from '../Present/PresentTypes';

export default function DeckBuilder() {
  const [message, setMessage] = useState<string | null>();
  const [file, setFile] = useState<File>();
  const [deck, setDeck] = useState<Deck>();
  const [connection, setConnection] = useState<Connection | null | undefined>();
  const fileReader = new FileReader();

  useEffect(() => {
    setConnection(connect(ChannelType.BUILDER, event => {}));
    setMessage('Deck builder connected');
  }, []);

  useEffect(() => {
    if (connection) {
      connection.channel.postMessage(
        new PresentData({
          slide: null,
          message: message,
          useGreenScreen: false,
        }),
      );
    }
  }, [message]);

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
      setDeck(JSON.parse(presentationJson) as Deck);
    });

    fileReader.readAsText(file);
    const fileInput = document.getElementById('file') as HTMLInputElement;
    fileInput.value = '';
  };

  const handleSendClick = (props: PresentDataProps) => {
    connection?.channel.postMessage(new PresentData(props));
  };

  const handleSaveClick = () => {};

  return (
    <>
      <h1>Deck</h1>
      <div>
        <input
          id="file"
          type="file"
          onChange={handleFileChange}
          style={{ width: '400px', border: '1px solid black' }}
        />
        <button id="load" onClick={e => handleUploadClick()}>
          Load{' '}
        </button>
        <button id="save" onCanPlay={handleSaveClick}>
          Save
        </button>
      </div>
      <div>
        <h2>Slides</h2>
        <div id="slides">
          <ul>
            {deck?.slides.map((slide, index) => {
              return (
                <li key={index}>
                  <SlideDisplay
                    deck={deck}
                    slide={slide}
                    sendAction={handleSendClick}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
