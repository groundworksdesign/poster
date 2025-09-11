import {
  Deck,
  Slide,
  SlideType,
  PresentDataProps,
  LyricsNavigation,
} from '../Present/PresentTypes';

export default function SlideDisplay({
  deck,
  slide,
  sendAction,
}: {
  deck: Deck;
  slide: Slide;
  sendAction: (props: PresentDataProps) => void;
}) {
  const style = {
    ...deck?.slideStyles[SlideType.GENERAL.toString()],
    ...deck?.slideStyles[slide.type.toString()],
  };
  const props = {
    slide: { ...slide, style: style },
    useGreenScreen: deck?.useGreenScreen,
  } as PresentDataProps;

  const sendNavigationCommand = (command: LyricsNavigation) => {
    sendAction({
      lyricsNavigation: { 
        ...command, 
        timestamp: Date.now() // Always use a fresh timestamp
      },
    });
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', margin: '5px' }}>
      <div><strong>{slide.title}</strong></div>
      {slide.subTitle && <div><em>{slide.subTitle}</em></div>}
      <div>Type: {slide.type}</div>
      {slide.lyrics && (
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          Verses: {slide.lyrics.verses.length}
        </div>
      )}
      <button 
        onClick={() => sendAction(props)}
        style={{ marginTop: '10px', padding: '5px 15px' }}
      >
        Send to Presentation
      </button>
      
      {/* Song navigation controls */}
      {slide.type === SlideType.SONG && slide.lyrics && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
            Lyrics Navigation:
          </div>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
            <button
              onClick={() => sendNavigationCommand({ command: 'previous' })}
              style={{ 
                padding: '3px 8px', 
                fontSize: '11px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              ← Previous
            </button>
            <button
              onClick={() => sendNavigationCommand({ command: 'next' })}
              style={{ 
                padding: '3px 8px', 
                fontSize: '11px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Next →
            </button>
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            Verses: {' '}
            {slide.lyrics.verses.map((verse, index) => (
              <button
                key={index}
                onClick={() => sendNavigationCommand({ command: 'goToVerse', verseIndex: index })}
                style={{
                  padding: '2px 6px',
                  fontSize: '10px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  marginRight: '3px',
                }}
              >
                {verse.number}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
