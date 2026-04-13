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
import SafeAreaOverlay from './SafeAreaOverlay';

export default function Presentation() {
  const [loading, setLoading] = useState<boolean>(true);
  const [slide, setSlide] = useState<Slide | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [useGreenScreen, setUseGreenScreen] = useState<boolean>(false);
  const [songData, setSongData] = useState<SongData | null>(null);
  const [segmentIndex, setSegmentIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => !!document.fullscreenElement);
  // Broadcast-safe overlay: activated by ?safearea=1 query param or S key toggle
  // NOTE: capture the presenter URL without this param for a clean program feed.
  const [showSafeArea, setShowSafeArea] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('safearea');
    return v === '1' || v === 'true';
  });
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
    const connection = connect(ChannelType.PRESENTER, broadcastEventHandler);
    setLoading(false);
    return () => {
      try {
        // ensure we remove the handler before closing to avoid duplicate handlers
        if (connection && connection.channel) {
          // clear handler reference then close channel
          (connection.channel as any).onmessage = null;
          connection.channel.close();
        }
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      if (typeof document.exitFullscreen === 'function') {
        document.exitFullscreen().catch(() => {});
      }
      return;
    }
    const el = document.documentElement;
    if (el && typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      // S toggles the broadcast-safe overlay (only when focus is not in an input)
      if ((e.key === 's' || e.key === 'S') && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setShowSafeArea(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const body = document.body;
    const previous = body.style.backgroundColor;
    if (useGreenScreen) body.style.backgroundColor = '#00b140';
    else body.style.backgroundColor = 'inherit';
    return () => { body.style.backgroundColor = previous; };
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
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <button
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        style={{
          position: 'fixed',
          bottom: '12px',
          right: '12px',
          zIndex: 9999,
          opacity: 0.25,
          padding: '4px 10px',
          fontSize: '12px',
          cursor: 'pointer',
          background: '#000',
          color: '#fff',
          border: '1px solid #fff',
          borderRadius: '4px',
        }}
        onMouseEnter={e => ((e.target as HTMLElement).style.opacity = '0.85')}
        onMouseLeave={e => ((e.target as HTMLElement).style.opacity = '0.25')}
      >
        {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      </button>
      <div id="message">{message}</div>
      <div id="slide" style={{ height: '100%', width: '100%' }}>
        {slide?.type === SlideType.SONG && songData ? (
          <div id="song" style={{ ...computeContainerStyle(), position: 'relative' }}>
            <div style={{ height: '100%', width: '100%' }}>
              <LyricsDisplay song={songData} segmentIndex={segmentIndex} />
            </div>
            {(slide?.title || slide?.subTitle) && (
              <div data-testid="slide-overlay" style={getTitleOverlayStyle()}>
                <div style={{ fontSize: slide?.titleFontSize ?? slide?.style?.fontSize }}>{slide?.title}</div>
                <div style={{ fontSize: slide?.subTitleFontSize ?? slide?.style?.fontSize }}>{slide?.subTitle}</div>
              </div>
            )}
          </div>
        ) : slide?.type === SlideType.IMAGE ? (
          <div id="image-slide" style={{ ...computeContainerStyle(), position: 'relative' }}>
            <div style={{ textAlign: 'inherit', color: slide?.style?.color }} />
            {(slide?.title || slide?.subTitle) && (
              <div data-testid="slide-overlay" style={getTitleOverlayStyle()}>
                <div style={{ fontSize: slide?.titleFontSize ?? slide?.style?.fontSize }}>{slide?.title}</div>
                <div style={{ fontSize: slide?.subTitleFontSize ?? slide?.style?.fontSize }}>{slide?.subTitle}</div>
              </div>
            )}
          </div>
        ) : (
          <div id="content" style={{ ...computeContainerStyle(), position: 'relative' }}>
            {(slide?.title || slide?.subTitle) && (
              <div data-testid="slide-overlay" style={getTitleOverlayStyle()}>
                <div style={{ fontSize: slide?.titleFontSize ?? slide?.style?.fontSize }}>{slide?.title}</div>
                <div style={{ fontSize: slide?.subTitleFontSize ?? slide?.style?.fontSize }}>{slide?.subTitle}</div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Broadcast-safe overlay: use ?safearea=1 or press S to toggle.
          Keep the clean program feed URL free of this param for mixer capture. */}
      <SafeAreaOverlay visible={showSafeArea} />
    </div>
  );

  return display;
}
