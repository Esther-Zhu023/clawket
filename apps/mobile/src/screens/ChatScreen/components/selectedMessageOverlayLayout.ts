import { MessageSelectionFrames } from '../../../components/MessageBubble';
import { Space } from '../../../theme/tokens';

type Args = {
  copyButtonSize: number;
  frames: MessageSelectionFrames | null;
  insetsTop: number;
  modalBottomInset: number;
  screenHeight: number;
  screenWidth: number;
};

export type SelectedMessageOverlayLayout = {
  containerHeight: number;
  containerLeft: number;
  containerTop: number;
  containerWidth: number;
  copyButtonLeft: number;
  copyButtonTop: number;
  favoriteButtonLeft: number;
  favoriteButtonTop: number;
  shareButtonLeft: number;
  shareButtonTop: number;
  scrollEnabled: boolean;
};

const OVERLAY_SIDE_MARGIN = Space.xs;
const OVERLAY_TOP_MARGIN = Space.md;
const OVERLAY_BOTTOM_MARGIN = Space.md;
const COPY_BUTTON_GAP = Space.md - 2;
const ACTION_BUTTON_SPACING = Space.sm;

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

export function getSelectedMessageOverlayLayout({
  copyButtonSize,
  frames,
  insetsTop,
  modalBottomInset,
  screenHeight,
  screenWidth,
}: Args): SelectedMessageOverlayLayout | null {
  if (!frames) return null;

  const topBound = Math.max(insetsTop + OVERLAY_TOP_MARGIN, OVERLAY_TOP_MARGIN);
  const bottomBound = screenHeight - Math.max(modalBottomInset + OVERLAY_BOTTOM_MARGIN, OVERLAY_BOTTOM_MARGIN);
  const maxContainerHeight = bottomBound - topBound - COPY_BUTTON_GAP - copyButtonSize;

  if (maxContainerHeight <= 0) return null;

  const { rowFrame, bubbleFrame } = frames;
  const maxContainerWidth = screenWidth - OVERLAY_SIDE_MARGIN * 2;
  const containerWidth = Math.min(rowFrame.width, maxContainerWidth);
  const containerHeight = Math.min(rowFrame.height, maxContainerHeight);
  const containerLeft = clamp(rowFrame.x, OVERLAY_SIDE_MARGIN, screenWidth - containerWidth - OVERLAY_SIDE_MARGIN);
  const containerTop = clamp(rowFrame.y, topBound, bottomBound - COPY_BUTTON_GAP - copyButtonSize - containerHeight);
  const copyButtonLeft = clamp(
    bubbleFrame.x + bubbleFrame.width - copyButtonSize,
    Space.md,
    screenWidth - copyButtonSize - Space.md,
  );
  const copyButtonTop = Math.min(containerTop + containerHeight + COPY_BUTTON_GAP, bottomBound - copyButtonSize);

  const shareButtonLeft = copyButtonLeft - copyButtonSize - ACTION_BUTTON_SPACING;
  const favoriteButtonLeft = shareButtonLeft - copyButtonSize - ACTION_BUTTON_SPACING;
  const minLeft = Space.md;
  const clampedFavoriteButtonLeft = Math.max(minLeft, favoriteButtonLeft);
  const shareButtonTop = copyButtonTop;

  return {
    containerHeight,
    containerLeft,
    containerTop,
    containerWidth,
    copyButtonLeft,
    copyButtonTop,
    favoriteButtonLeft: clampedFavoriteButtonLeft,
    favoriteButtonTop: copyButtonTop,
    shareButtonLeft: clampedFavoriteButtonLeft === favoriteButtonLeft
      ? shareButtonLeft
      : copyButtonLeft - copyButtonSize - ACTION_BUTTON_SPACING,
    shareButtonTop,
    scrollEnabled: rowFrame.height > containerHeight,
  };
}
