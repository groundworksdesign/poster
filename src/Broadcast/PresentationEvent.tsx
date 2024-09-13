export const enum SlideType {
  TITLE = 'title',
  SONG = 'song',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export type SlideContent = { title: string; subTitle: string };
export type Slide = {
  slideType: SlideType;
  styles: object;
  content: SlideContent;
};

export const SlideDisplay = ({ slide }: { slide: Slide }) => {
  return (
    <div>
      <div>{slide.content.title} </div>
      <div> {slide.content.subTitle} </div>
    </div>
  );
};

export class PresentationEvent {
  slide: Slide | null = null;
  message: string | null = null;
  constructor(slide: Slide | null, message: string | null = null) {
    this.slide = slide;
    this.message = message;
  }
}
