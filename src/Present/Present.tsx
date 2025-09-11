import { useEffect, useState } from 'react';
import { connect, ChannelType, Connection, BroadcastEvent } from './Broadcast';
import { PresentData, Slide, VerticalAlign } from './PresentTypes';

export default function Presentation() {
  const [loading, setLoading] = useState<boolean>(true);
  const [slide, setSlide] = useState<Slide | null | undefined>(null);
  const [message, setMessage] = useState<string | null | undefined>(null);
  const [useGreenScreen, setUseGreenScreen] = useState<
    boolean | null | undefined
  >(false);
  const [connection, setConnection] = useState<Connection | null | undefined>();
  const root = document.getElementsByTagName('body');

  const broadcastEventHandler = (event: MessageEvent) => {
    const broadcastEvent = event.data as BroadcastEvent;
    if (broadcastEvent) {
      const present = event.data as PresentData;
      if (present) {
        // console.log('Event Slide:', present.slide);
        setSlide(present.slide);
        setMessage(present.message);
        setUseGreenScreen(present.useGreenScreen);
        return broadcastEvent;
      }
    }
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
      <div
        id="slide"
        style={{
          height: '100%',
          width: '100%',
        }}
      >
        <div
          id="content"
          style={{
            backgroundColor: slide?.style.backgroundColor,
            color: slide?.style.color,
            position: 'absolute',
            bottom: '0px',
            width: slide?.style.width ?? '100%',
            height: slide?.style.height ?? '150px',
            verticalAlign:
              slide?.style.verticalAlign ?? VerticalAlign.MIDDLE.toString(),
            fontFamily: slide?.style.fontFamily,
            paddingTop: '20px',
          }}
        >
          <div
            style={{
              fontSize: slide?.titleFontSize ?? slide?.style.fontSize,
            }}
          >
            {slide?.title}
          </div>
          <div
            style={{
              fontSize: slide?.subTitleFontSize ?? slide?.style.fontSize,
            }}
          >
            {slide?.subTitle}
          </div>
        </div>
      </div>
    </div>
  );
  return display;
}
