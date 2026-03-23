import { getSelectedMessageOverlayLayout } from './selectedMessageOverlayLayout';

const frames = {
  rowFrame: { x: 8, y: 120, width: 320, height: 140 },
  bubbleFrame: { x: 68, y: 152, width: 240, height: 92 },
};

describe('getSelectedMessageOverlayLayout', () => {
  it('keeps short messages near their original position without scrolling', () => {
    const layout = getSelectedMessageOverlayLayout({
      copyButtonSize: 46,
      frames,
      insetsTop: 44,
      modalBottomInset: 34,
      screenHeight: 900,
      screenWidth: 400,
    });

    expect(layout).toEqual({
      containerHeight: 140,
      containerLeft: 8,
      containerTop: 120,
      containerWidth: 320,
      copyButtonLeft: 262,
      copyButtonTop: 270,
      favoriteButtonLeft: 154,
      favoriteButtonTop: 270,
      shareButtonLeft: 208,
      shareButtonTop: 270,
      scrollEnabled: false,
    });
  });

  it('clamps long messages into the overlay viewport and enables scrolling', () => {
    const layout = getSelectedMessageOverlayLayout({
      copyButtonSize: 46,
      frames: {
        rowFrame: { x: 8, y: 180, width: 320, height: 900 },
        bubbleFrame: { x: 68, y: 212, width: 240, height: 852 },
      },
      insetsTop: 44,
      modalBottomInset: 34,
      screenHeight: 900,
      screenWidth: 400,
    });

    expect(layout).toEqual({
      containerHeight: 742,
      containerLeft: 8,
      containerTop: 56,
      containerWidth: 320,
      copyButtonLeft: 262,
      copyButtonTop: 808,
      favoriteButtonLeft: 154,
      favoriteButtonTop: 808,
      shareButtonLeft: 208,
      shareButtonTop: 808,
      scrollEnabled: true,
    });
  });
});
