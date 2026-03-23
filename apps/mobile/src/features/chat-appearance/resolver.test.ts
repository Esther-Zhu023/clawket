import { buildTheme } from '../../theme/theme';
import { builtInAccents, defaultAccentId } from '../../theme/accents';
import { DEFAULT_CHAT_APPEARANCE } from './defaults';
import { resolveChatBubbleAppearance } from './resolver';

describe('resolveChatBubbleAppearance', () => {
  it('keeps the default solid bubbles unbordered', () => {
    const theme = buildTheme('light', 'light', builtInAccents[defaultAccentId]);

    const result = resolveChatBubbleAppearance(theme, DEFAULT_CHAT_APPEARANCE);

    expect(result.userBubble.borderWidth).toBe(0);
    expect(result.userBubble.shadow).toBe(false);
    expect(result.assistantBubble.borderWidth).toBe(0);
    expect(result.assistantBubble.shadow).toBe(false);
  });

  it('adds translucent borders and shadows for glass bubbles', () => {
    const theme = buildTheme('dark', 'dark', builtInAccents[defaultAccentId]);

    const result = resolveChatBubbleAppearance(theme, {
      ...DEFAULT_CHAT_APPEARANCE,
      background: {
        ...DEFAULT_CHAT_APPEARANCE.background,
        enabled: true,
        imagePath: 'file:///wallpaper.jpg',
      },
      bubbles: {
        style: 'glass',
        opacity: 0.9,
      },
    });

    expect(result.userBubble.borderWidth).toBe(1);
    expect(result.userBubble.shadow).toBe(true);
    expect(result.userBubble.backgroundColor).toContain('rgba(');
    expect(result.assistantBubble.borderWidth).toBe(1);
    expect(result.assistantBubble.shadow).toBe(true);
  });
});
