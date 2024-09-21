export const enum SlideType {
  GENERAL = 'general',
  TITLE = 'title',
  SONG = 'song',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export const enum HorizontalAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
}

export const enum VerticalAlign {
  TOP = 'top',
  MIDDLE = 'middle',
  BOTTOM = 'bottom',
}

export type SlideCSS = {
  backgroundColor?: string | undefined;
  color?: string | undefined;
  height?: string | undefined;
  width?: string | undefined;
  horizontalAlign?: HorizontalAlign | undefined;
  verticalAlign?: VerticalAlign | undefined;
  fontFamily?: string | undefined;
  fontSize?: string | undefined;
  fontWeight?: string | undefined;
  title?: SlideCSS | undefined;
  subTitle?: SlideCSS | undefined;
};

export type Slide = {
  type: SlideType;
  title: string;
  subTitle: string | undefined;
  file: string | undefined;
  style: SlideCSS;
};

export const SlideDisplay = ({ slide }: { slide: Slide }) => {
  return (
    <div>
      <div>{slide.title} </div>
      <div> {slide.subTitle} </div>
    </div>
  );
};

export type PresentationEventProps = {
  slide?: Slide | null;
  message?: string | null;
  useGreenScreen?: boolean | null;
};

export class PresentationEvent {
  slide?: Slide | null = null;
  message?: string | null = null;
  useGreenScreen?: boolean | null = null;

  constructor(props: PresentationEventProps) {
    if (props.slide) this.slide = props.slide;
    if (props.message) this.message = props.message;
    if (props.useGreenScreen) this.useGreenScreen = props.useGreenScreen;
  }
}

interface StyleDictionary {
  [key: string]: SlideCSS;
}

export type PresentationData = {
  title: string;
  date: string;
  location: string;
  useGreenScreen: boolean;
  notes: string;
  slideStyles: StyleDictionary;
  deck: Slide[];
};
