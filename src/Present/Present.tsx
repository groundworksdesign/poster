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

function flexAlignFromHorizontal(h?: HorizontalAlign): React.CSSProperties['alignItems'] {
  if (h === HorizontalAlign.LEFT) return 'flex-start';
  if (h === HorizontalAlign.RIGHT) return 'flex-end';
  return 'center';
}

export default function Presentation() {
  const [loading, setLoading] = useState<boolean>(true);
  const [slide, setSlide] = useState<Slide | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [useGreenScreen, setUseGreenScreen] = useState<boolean>(false);
  const [songData, setSongData] = useState<SongData | null>(null);
  const [segmentIndex, setSegmentIndex] = useState<number>(0);
  // Broadcast-safe overlay: activated by ?safearea=1 query param or S key toggle
  // NOTE: capture the presenter URL without this param for a clean program feed.
  const [showSafeArea, setShowSafeArea] = useState<boolean>(false);
  const [inFullscreen, setInFullscreen] = useState<boolean>(false);
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
    const params = new URLSearchParams(window.location.search);
    const v = params.get('safearea');
    setShowSafeArea(v === '1' || v === 'true');
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const syncFullscreenChrome = () => {
      const fs = !!document.fullscreenElement;
      setInFullscreen(fs);
      if (fs) {
        html.style.overflow = 'hidden';
        html.style.overflowX = 'hidden';
        html.style.overflowY = 'hidden';
        body.style.overflow = 'hidden';
        body.style.overflowX = 'hidden';
        body.style.overflowY = 'hidden';
        html.style.width = '100%';
        html.style.maxWidth = '100%';
        body.style.width = '100%';
        body.style.maxWidth = '100%';
        html.style.margin = '0';
        body.style.margin = '0';
        html.style.overscrollBehavior = 'none';
        body.style.overscrollBehavior = 'none';
      } else {
        html.style.overflow = '';
        html.style.overflowX = '';
        html.style.overflowY = '';
        body.style.overflow = '';
        body.style.overflowX = '';
        body.style.overflowY = '';
        html.style.width = '';
        html.style.maxWidth = '';
        body.style.width = '';
        body.style.maxWidth = '';
        html.style.margin = '';
        body.style.margin = '';
        html.style.overscrollBehavior = '';
        body.style.overscrollBehavior = '';
      }
    };
    document.addEventListener('fullscreenchange', syncFullscreenChrome);
    syncFullscreenChrome();
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenChrome);
      html.style.overflow = '';
      html.style.overflowX = '';
      html.style.overflowY = '';
      body.style.overflow = '';
      body.style.overflowX = '';
      body.style.overflowY = '';
      html.style.width = '';
      html.style.maxWidth = '';
      body.style.width = '';
      body.style.maxWidth = '';
      html.style.margin = '';
      body.style.margin = '';
      html.style.overscrollBehavior = '';
      body.style.overscrollBehavior = '';
    };
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
    const html = document.documentElement;
    const prevBodyMargin = body.style.margin;
    const prevBodyH = body.style.height;
    const prevHtmlH = html.style.height;
    body.style.margin = '0';
    body.style.height = '100%';
    html.style.height = '100%';
    return () => {
      body.style.margin = prevBodyMargin;
      body.style.height = prevBodyH;
      html.style.height = prevHtmlH;
    };
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
      boxSizing: 'border-box',
      textAlign,
      backgroundColor: useGreenScreen ? 'transparent' : slide?.style?.backgroundColor,
      color: slide?.style?.color,
      width: slide?.style?.width ?? '100%',
      height: '100%',
      minHeight: 0,
      maxWidth: '100%',
      fontFamily: slide?.style?.fontFamily,
      padding: 0,
      margin: 0,
      backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
      backgroundSize: slide?.style?.backgroundSize ?? 'cover',
      backgroundPosition: slide?.style?.backgroundPosition ?? 'center',
      backgroundRepeat: 'no-repeat',
    } as React.CSSProperties;
  };

  /** Absolutely positioned title (image / non-song slides). */
  const getTitleOverlayStyle = (): React.CSSProperties => {
    const v = slide?.style?.verticalAlign;
    const h = slide?.style?.horizontalAlign;
    const alignItems = flexAlignFromHorizontal(h);
    const textAlign = slide?.style?.horizontalAlign ?? 'center';
    const base: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      right: 0,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems,
      textAlign,
      zIndex: 2,
      boxSizing: 'border-box',
    };
    if (useGreenScreen && slide?.style?.backgroundColor) {
      base.backgroundColor = slide.style.backgroundColor;
      base.padding = '8px 0';
    }
    if (v === VerticalAlign.TOP) base.top = 0;
    else if (v === VerticalAlign.BOTTOM) base.bottom = 0;
    else {
      base.top = '50%';
      base.transform = 'translateY(-50%)';
    }
    return base;
  };

  const renderTitleOverlay = () =>
    (slide?.title || slide?.subTitle) && (
      <div data-testid="slide-overlay" style={getTitleOverlayStyle()}>
        <div style={{ fontSize: slide?.titleFontSize ?? slide?.style?.fontSize }}>{slide?.title}</div>
        <div style={{ fontSize: slide?.subTitleFontSize ?? slide?.style?.fontSize }}>{slide?.subTitle}</div>
      </div>
    );

  const songShellStyle: React.CSSProperties = {
    ...computeContainerStyle(),
    position: 'relative',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  };

  const justifyForSongVertical = (v?: VerticalAlign): React.CSSProperties['justifyContent'] => {
    if (v === VerticalAlign.TOP) return 'flex-start';
    if (v === VerticalAlign.BOTTOM) return 'flex-end';
    return 'center';
  };

  /** Slide-colored band in green-screen mode; transparent when the shell already paints the background. */
  const songContentPanelStyle = (opts?: { flexFill?: boolean }): React.CSSProperties => {
    const bg = slide?.style?.backgroundColor;
    const base: React.CSSProperties = {
      width: '100%',
      boxSizing: 'border-box',
      ...(useGreenScreen && bg
        ? {
            backgroundColor: bg,
            color: slide?.style?.color,
            padding: '20px 16px',
          }
        : {}),
    };
    if (opts?.flexFill) {
      base.flex = 1;
      base.minHeight = 0;
      base.display = 'flex';
      base.flexDirection = 'column';
    }
    return base;
  };

  /** First song stage: title + subtitle only, typography similar to a TITLE slide. */
  const renderSongTitleIntro = () =>
    (slide?.title || slide?.subTitle) && (
      <div
        data-testid="slide-overlay"
        style={{
          ...songContentPanelStyle(),
          display: 'flex',
          flexDirection: 'column',
          alignItems: flexAlignFromHorizontal(slide?.style?.horizontalAlign),
          textAlign: (slide?.style?.horizontalAlign ?? 'center') as React.CSSProperties['textAlign'],
          gap: '0.35em',
        }}
      >
        {slide?.title ? (
          <div
            style={{
              fontSize: slide.titleFontSize ?? 'clamp(36px, 7vw, 72px)',
              fontWeight: 600,
              lineHeight: 1.15,
            }}
          >
            {slide.title}
          </div>
        ) : null}
        {slide?.subTitle ? (
          <div
            style={{
              fontSize: slide.subTitleFontSize ?? 'clamp(20px, 3.5vw, 40px)',
              fontWeight: 400,
              lineHeight: 1.2,
              opacity: 0.95,
            }}
          >
            {slide.subTitle}
          </div>
        ) : null}
      </div>
    );

  const display = loading ? (
    <h1>Loading...</h1>
  ) : (
    <div
      style={{
        minHeight: '100vh',
        height: '100vh',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        margin: 0,
        padding: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: inFullscreen ? 'hidden' : undefined,
        overflowX: inFullscreen ? 'hidden' : undefined,
        boxSizing: 'border-box',
      }}
    >
      <div id="message" style={{ flexShrink: 0 }}>{message}</div>
      <div
        id="slide"
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflowX: inFullscreen ? 'hidden' : undefined,
        }}
      >
        {slide?.type === SlideType.SONG ? (
          (() => {
            const hasLyrics =
              !!songData &&
              songData.verses.some(v => v.lines.some(l => (l ?? '').trim() !== ''));
            const v = slide?.style?.verticalAlign ?? VerticalAlign.MIDDLE;
            const ha = slide?.style?.horizontalAlign;
            const va = slide?.style?.verticalAlign;
            const useLyricsFill = v === VerticalAlign.TOP;
            return (
              <div id="song" style={songShellStyle}>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: justifyForSongVertical(v),
                    alignItems: 'stretch',
                  }}
                >
                  {hasLyrics && songData ? (
                    <div style={songContentPanelStyle({ flexFill: useLyricsFill })}>
                      <LyricsDisplay
                        song={songData}
                        segmentIndex={segmentIndex}
                        horizontalAlign={ha}
                        verticalAlign={va}
                        fillHeight={useLyricsFill}
                      />
                    </div>
                  ) : (
                    renderSongTitleIntro()
                  )}
                </div>
              </div>
            );
          })()
        ) : slide?.type === SlideType.IMAGE ? (
          <div id="image-slide" style={{ ...computeContainerStyle(), position: 'relative', flex: 1, minHeight: 0 }}>
            <div style={{ textAlign: 'inherit', color: slide?.style?.color }} />
            {renderTitleOverlay()}
          </div>
        ) : (
          <div id="content" style={{ ...computeContainerStyle(), position: 'relative', flex: 1, minHeight: 0 }}>
            {renderTitleOverlay()}
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
