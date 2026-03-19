import { useEffect, useState } from 'react';
import { connect, ChannelType, Connection } from './Broadcast';
import { PresentData, Slide, SlideType, SongData, HorizontalAlign, VerticalAlign } from './PresentTypes';
import LyricsDisplay from './LyricsDisplay';

export default function Presentation() {
  const [loading, setLoading] = useState<boolean>(true);
  const [slide, setSlide] = useState<Slide | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [useGreenScreen, setUseGreenScreen] = useState<boolean>(false);
  const [connection, setConnection] = useState<Connection | null | undefined>();
  const [songData, setSongData] = useState<SongData | null>(null);
  const [segmentIndex, setSegmentIndex] = useState<number>(0);
  const root = document.getElementsByTagName('body');

  const broadcastEventHandler = (event: MessageEvent) => {
    const present = event.data as PresentData;
    if (!present) return;

    // If this is a partial update for lyrics navigation, update segmentIndex
    if ((present as any).data && (present as any).data.lyricsNavigation) {
      const nav = (present as any).data.lyricsNavigation;
      const cmd = nav.command;
      if (cmd === 'next') setSegmentIndex(i => i + 1);
      else if (cmd === 'previous') setSegmentIndex(i => Math.max(0, i - 1));
      else if (cmd === 'goToVerse' && typeof nav.verseIndex === 'number')
        setSegmentIndex(nav.verseIndex);
      return present;
    }

    // Full present payload — update slide/message/useGreenScreen
    if (present.slide) {
      setSlide(present.slide);
      setMessage(present.message ?? null);
      setUseGreenScreen(!!present.useGreenScreen);

      // If this is a song slide, extract SongData and reset segmentIndex
      if (present.slide.type === SlideType.SONG && present.slide.lyrics) {
        setSongData(present.slide.lyrics as SongData);
        setSegmentIndex(0);
      } else {
        setSongData(null);
        setSegmentIndex(0);
      }
    } else if (present.message) {
      setMessage(present.message);
    }

    return present;
  };

  useEffect(() => {
    setConnection(connect(ChannelType.PRESENTER, broadcastEventHandler));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (useGreenScreen) root[0].style.backgroundColor = '#00b140';
    else root[0].style.backgroundColor = 'inherit';
  }, [useGreenScreen]);

  const display = loading ? (
    <h1>Loading...</h1>
  ) : (
    <div style={{ height: '100%', width: '100%' }}>
      <div id="message">{message}</div>
      <div id="slide" style={{ height: '100%', width: '100%' }}>
        {slide?.type === SlideType.SONG && songData ? (
          <div id="song" style={{ height: '100%', width: '100%' }}>
            <LyricsDisplay song={songData} segmentIndex={segmentIndex} />
          </div>
        ) : (
          <div
            id="content"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent:
                (slide?.style?.verticalAlign === VerticalAlign.TOP && 'flex-start') ||
                (slide?.style?.verticalAlign === VerticalAlign.BOTTOM && 'flex-end') ||
                'center',
              alignItems:
                (slide?.style?.horizontalAlign === HorizontalAlign.LEFT && 'flex-start') ||
                (slide?.style?.horizontalAlign === HorizontalAlign.RIGHT && 'flex-end') ||
                'center',
              textAlign: slide?.style?.horizontalAlign ?? 'center',
              backgroundColor: useGreenScreen ? 'transparent' : slide?.style?.backgroundColor,
              color: slide?.style?.color,
              width: slide?.style?.width ?? '100%',
              height: slide?.style?.height ?? '150px',
              fontFamily: slide?.style?.fontFamily,
              padding: '20px',
              backgroundImage: slide?.style?.backgroundImage ? `url(${slide.style.backgroundImage})` : undefined,
              backgroundSize: slide?.style?.backgroundSize ?? 'cover',
              backgroundPosition: slide?.style?.backgroundPosition ?? 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div style={{ fontSize: slide?.titleFontSize ?? slide?.style?.fontSize }}>{slide?.title}</div>
            <div style={{ fontSize: slide?.subTitleFontSize ?? slide?.style?.fontSize }}>{slide?.subTitle}</div>
          </div>
        )}
      </div>
    </div>
  );

  return display;
}
