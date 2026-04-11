import React, { useEffect, useState } from 'react';
import { connect, ChannelType } from './Broadcast';
import {
  PresentData,
  Slide,
  SlideType,
  SongData,
  HorizontalAlign,
  VerticalAlign,
} from './PresentTypes';
import LyricsDisplay from './LyricsDisplay';

export default function Presentation() {
  const [loading, setLoading] = useState<boolean>(true);
  const [slide, setSlide] = useState<Slide | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [useGreenScreen, setUseGreenScreen] = useState<boolean>(false);
  const [songData, setSongData] = useState<SongData | null>(null);
  const [segmentIndex, setSegmentIndex] = useState<number>(0);
  const broadcastEventHandler = (event: MessageEvent) => {
    const present = event.data as PresentData;
    if (!present) return;

    // Partial updates (e.g., lyrics navigation)
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
    } else if (present.message || present.message === '') {
      setMessage(present.message);
    }

    return present;
  };

  useEffect(() => {
    connect(ChannelType.PRESENTER, broadcastEventHandler);
    setLoading(false);
  }, []);

  useEffect(() => {
    const body = document.body;
    if (useGreenScreen) body.style.backgroundColor = '#00b140';
    else body.style.backgroundColor = 'inherit';
  }, [useGreenScreen]);

  const computeContainerStyle = (): React.CSSProperties => {
    const textAlign = slide?.style?.horizontalAlign ?? 'center';

    const backgroundImage =
      !useGreenScreen &&
      (slide?.type === SlideType.IMAGE
        ? slide?.file ?? slide?.style?.backgroundImage
        : slide?.style?.backgroundImage);

    return {
      textAlign,
      backgroundColor: useGreenScreen ? 'transparent' : slide?.style?.backgroundColor,
      color: slide?.style?.color,
      width: slide?.style?.width ?? '100%',
      height: slide?.style?.height ?? '100%',
      fontFamily: slide?.style?.fontFamily,
      padding: '20px',
      backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
      backgroundSize: slide?.style?.backgroundSize ?? 'cover',
      backgroundPosition: slide?.style?.backgroundPosition ?? 'center',
      backgroundRepeat: 'no-repeat',
    } as React.CSSProperties;
  };

  const getTitleOverlayStyle = (): React.CSSProperties => {
    const v = slide?.style?.verticalAlign;
    const h = slide?.style?.horizontalAlign;
    const alignItems = h === HorizontalAlign.LEFT ? 'flex-start' : h === HorizontalAlign.RIGHT ? 'flex-end' : 'center';
    const textAlign = slide?.style?.horizontalAlign ?? 'center';
    const base: any = { position: 'absolute', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems, textAlign };
    if (v === VerticalAlign.TOP) base.top = '20px';
    else if (v === VerticalAlign.BOTTOM) base.bottom = '20px';
    else { base.top = '50%'; base.transform = 'translateY(-50%)'; }
    return base as React.CSSProperties;
  };

  const display = loading ? (
    <h1>Loading...</h1>
  ) : (
    <div style={{ height: '100%', width: '100%' }}>
      <div id="message">{message}</div>
      <div id="slide" style={{ height: '100%', width: '100%' }}>
        {slide?.type === SlideType.SONG && songData ? (
          <div id="song" style={{ ...computeContainerStyle(), position: 'relative' }}>
            <div style={{ height: '100%', width: '100%' }}>
              <LyricsDisplay song={songData} segmentIndex={segmentIndex} />
            </div>
            {(slide?.title || slide?.subTitle) && (
              <div style={getTitleOverlayStyle()}>
                <div style={{ fontSize: slide?.titleFontSize ?? slide?.style?.fontSize }}>{slide?.title}</div>
                <div style={{ fontSize: slide?.subTitleFontSize ?? slide?.style?.fontSize }}>{slide?.subTitle}</div>
              </div>
            )}
          </div>
        ) : slide?.type === SlideType.IMAGE ? (
          <div id="image-slide" style={{ ...computeContainerStyle(), position: 'relative' }}>
            <div style={{ textAlign: 'inherit', color: slide?.style?.color }} />
            {(slide?.title || slide?.subTitle) && (
              <div style={getTitleOverlayStyle()}>
                <div style={{ fontSize: slide?.titleFontSize ?? slide?.style?.fontSize }}>{slide?.title}</div>
                <div style={{ fontSize: slide?.subTitleFontSize ?? slide?.style?.fontSize }}>{slide?.subTitle}</div>
              </div>
            )}
          </div>
        ) : (
          <div id="content" style={{ ...computeContainerStyle(), position: 'relative' }}>
            {(slide?.title || slide?.subTitle) && (
              <div style={getTitleOverlayStyle()}>
                <div style={{ fontSize: slide?.titleFontSize ?? slide?.style?.fontSize }}>{slide?.title}</div>
                <div style={{ fontSize: slide?.subTitleFontSize ?? slide?.style?.fontSize }}>{slide?.subTitle}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return display;
}
