import React, { useEffect, useState } from 'react';
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
import { createPresentSession } from './SessionTransport';
import { applyPresentPayload } from './applyPresentPayload';
import { useTheme } from '../utils/useTheme';
import { buildProgramThumbnail } from './programThumbnail';

function flexAlignFromHorizontal(h?: HorizontalAlign): React.CSSProperties['alignItems'] {
  if (h === HorizontalAlign.LEFT) return 'flex-start';
  if (h === HorizontalAlign.RIGHT) return 'flex-end';
  return 'center';
}

/** Non-title slides share this frame height; title slides use the full #slide area. */
const NON_TITLE_PROGRAM_HEIGHT = '72%';

export default function Presentation() {
  // Apply persisted chrome theme (same storage as Home / deck builders).
  useTheme();
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
  const [sessionError, setSessionError] = useState<string | null>(null);
  const presentSessionRef = React.useRef<Awaited<ReturnType<typeof createPresentSession>> | null>(
    null,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sessionId');
    const presentId = params.get('presentId');
    if (!sessionId || !presentId) {
      setSessionError('Open Present from the deck builder to connect this window.');
      setLoading(false);
      return;
    }

    let disposed = false;
    let closed = false;
    let presentSession: Awaited<ReturnType<typeof createPresentSession>> | null = null;
    const closeSession = () => {
      if (closed) return;
      closed = true;
      disposed = true;
      presentSessionRef.current = null;
      presentSession?.dispose();
    };
    window.addEventListener('pagehide', closeSession);

    createPresentSession(sessionId, presentId)
      .then((session) => {
        if (disposed) {
          session.dispose();
          return;
        }
        presentSession = session;
        presentSessionRef.current = session;
        session.onPresentPush((payload) => {
          applyPresentPayload(payload as PresentData, {
            setSlide,
            setMessage,
            setUseGreenScreen,
            setSongData,
            setSegmentIndex,
          });
        });
        setLoading(false);
      })
      .catch(() => {
        if (!disposed) {
          setSessionError('Could not connect to the deck session.');
          setLoading(false);
        }
      });

    return () => {
      window.removeEventListener('pagehide', closeSession);
      closeSession();
    };
  }, []);

  // Directed path: Present reports program state → Main → owning deck only.
  useEffect(() => {
    const session = presentSessionRef.current;
    if (!session || loading || sessionError) return;
    const program = buildProgramThumbnail({
      slide,
      message,
      songData,
      segmentIndex,
      useGreenScreen,
    });
    session.reportProgramState(program);
  }, [slide, message, songData, segmentIndex, useGreenScreen, loading, sessionError]);

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

  const isTitleSlideType = slide?.type === SlideType.TITLE;

  /** Flex sizing for the program slide frame: full raster for title, uniform band for all other types. */
  const slideFrameStyle = (): React.CSSProperties => {
    if (isTitleSlideType) {
      return { flex: 1, minHeight: 0, alignSelf: 'stretch' };
    }
    return {
      flex: '0 0 auto',
      height: NON_TITLE_PROGRAM_HEIGHT,
      maxHeight: NON_TITLE_PROGRAM_HEIGHT,
      minHeight: 0,
      alignSelf: 'stretch',
    };
  };

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
      width: '100%',
      maxWidth: '100%',
      fontFamily: slide?.style?.fontFamily,
      fontSize: slide?.style?.fontSize,
      fontWeight: slide?.style?.fontWeight,
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
    ...slideFrameStyle(),
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

  /** First song stage: title + subtitle only; font sizes match general slide overlay. */
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
          <div style={{ fontSize: slide.titleFontSize ?? slide?.style?.fontSize, lineHeight: 1.15 }}>
            {slide.title}
          </div>
        ) : null}
        {slide?.subTitle ? (
          <div style={{ fontSize: slide.subTitleFontSize ?? slide?.style?.fontSize, lineHeight: 1.2 }}>
            {slide.subTitle}
          </div>
        ) : null}
      </div>
    );

  const display = loading ? (
    <h1 data-testid="present-loading">Loading...</h1>
  ) : sessionError ? (
    <h1 data-testid="present-session-error">{sessionError}</h1>
  ) : (
    <div
      data-testid="present-ready"
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
          justifyContent: isTitleSlideType ? 'flex-start' : 'flex-end',
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
                        fontSize={slide?.style?.fontSize}
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
          <div id="image-slide" style={{ ...computeContainerStyle(), position: 'relative', ...slideFrameStyle() }}>
            <div style={{ textAlign: 'inherit', color: slide?.style?.color }} />
            {renderTitleOverlay()}
          </div>
        ) : (
          <div id="content" style={{ ...computeContainerStyle(), position: 'relative', ...slideFrameStyle() }}>
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
