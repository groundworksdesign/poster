import React, { ChangeEvent, useEffect, useState } from 'react';
import { connect, ChannelType, Connection } from '../Present/Broadcast';
import SlideDisplay from './SlideDisplay';
import {
  PresentData,
  PresentDataProps,
  Deck,
  SlideType,
} from '../Present/PresentTypes';
import { parseSongXML, createSongSlide } from '../utils/songParser';

export default function DeckBuilder() {
  const [message, setMessage] = useState<string | null>();
  const [file, setFile] = useState<File>();
  const [deck, setDeck] = useState<Deck>();
  const [connection, setConnection] = useState<Connection | null | undefined>();
  const [isLoadingSong, setIsLoadingSong] = useState<boolean>(false);
  const fileReader = new FileReader();

  useEffect(() => {
    setConnection(connect(ChannelType.BUILDER, event => {}));
    setMessage('Deck builder connected');
  }, []);

  useEffect(() => {
    if (connection && message) {
      connection.channel.postMessage(
        new PresentData({
          slide: null,
          message: message,
          useGreenScreen: false,
        }),
      );
    }
  }, [message, connection]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadClick = async () => {
    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.xml')) {
      // Handle XML song file
      setIsLoadingSong(true);
      try {
        fileReader.addEventListener('load', async () => {
          try {
            const xmlContent = fileReader.result as string;
            const songData = await parseSongXML(xmlContent);
            
            // Create a new deck with the song slide
            const songSlide = createSongSlide(songData, {
              backgroundColor: '#000000',
              color: '#ffffff',
              fontFamily: 'Arial, sans-serif',
              fontSize: '24px',
              height: '100%',
              width: '100%',
            });
            
            const newDeck: Deck = {
              title: `Song: ${songData.title}`,
              date: new Date().toISOString().split('T')[0],
              location: '',
              useGreenScreen: false,
              notes: `Loaded from ${file.name}`,
              slideStyles: {
                [SlideType.GENERAL]: {
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '24px',
                },
                [SlideType.SONG]: {
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '28px',
                  height: '100%',
                  width: '100%',
                },
              },
              slides: [songSlide],
            };
            
            setDeck(newDeck);
            setMessage(`Loaded song: ${songData.title}`);
          } catch (error) {
            setMessage(`Error parsing XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
          } finally {
            setIsLoadingSong(false);
          }
        });
        
        fileReader.readAsText(file);
      } catch (error) {
        setMessage(`Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsLoadingSong(false);
      }
    } else if (fileName.endsWith('.json')) {
      // Handle existing JSON deck file
      fileReader.addEventListener('load', () => {
        const presentationJson = fileReader.result as string;
        console.log('presentationJson:', presentationJson);
        setDeck(JSON.parse(presentationJson) as Deck);
        setMessage('Loaded JSON deck');
      });

      fileReader.readAsText(file);
    } else {
      setMessage('Unsupported file type. Please upload .json or .xml files.');
    }

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
          accept=".json,.xml"
          onChange={handleFileChange}
          style={{ width: '400px', border: '1px solid black' }}
        />
        <button 
          id="load" 
          onClick={e => handleUploadClick()}
          disabled={isLoadingSong}
        >
          {isLoadingSong ? 'Loading...' : 'Load'}
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
