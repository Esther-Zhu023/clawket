export type ChatBackgroundFillMode = 'cover' | 'contain';
export type ChatBubbleStyle = 'solid' | 'soft' | 'glass';

export type ChatAppearanceSettings = {
  version: 1;
  background: {
    enabled: boolean;
    imagePath?: string;
    blur: number;
    dim: number;
    fillMode: ChatBackgroundFillMode;
  };
  bubbles: {
    style: ChatBubbleStyle;
    opacity: number;
  };
};
