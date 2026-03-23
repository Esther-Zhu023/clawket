import { act, renderHook } from '@testing-library/react-native';
import { analyticsEvents } from '../../../services/analytics/events';
import { useChatModelPicker } from './useChatModelPicker';
import { SessionInfo } from '../../../types';

jest.mock('../../../services/analytics/events', () => ({
  analyticsEvents: {
    chatModelSelected: jest.fn(),
  },
}));

describe('useChatModelPicker', () => {
  let consoleErrorSpy: jest.SpyInstance;
  const mockedAnalytics = analyticsEvents as jest.Mocked<typeof analyticsEvents>;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((message?: unknown) => {
      if (typeof message === 'string' && message.includes('react-test-renderer is deprecated')) {
        return;
      }
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('does not open picker when gateway is not ready', () => {
    const { result } = renderHook(() =>
      useChatModelPicker({
        connectionState: 'connecting',
        gateway: { listModels: jest.fn() },
        sessionKey: 'agent:main:main',
        setInput: jest.fn(),
        setSessions: jest.fn(),
        submitMessage: jest.fn(),
      }),
    );

    expect(result.current.openModelPicker()).toBe(false);
    expect(result.current.modelPickerVisible).toBe(false);
  });

  it('opens picker and loads models successfully', async () => {
    const gateway = {
      listModels: jest.fn().mockResolvedValue([
        { id: 'gpt-5', name: 'gpt-5', provider: 'openai' },
      ]),
    };

    const { result } = renderHook(() =>
      useChatModelPicker({
        connectionState: 'ready',
        gateway,
        sessionKey: 'agent:main:main',
        setInput: jest.fn(),
        setSessions: jest.fn(),
        submitMessage: jest.fn(),
      }),
    );

    expect(result.current.openModelPicker()).toBe(true);
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.modelPickerVisible).toBe(true);
    expect(gateway.listModels).toHaveBeenCalledTimes(1);
    expect(result.current.availableModels).toEqual([
      { id: 'gpt-5', name: 'gpt-5', provider: 'openai' },
    ]);
    expect(result.current.modelPickerError).toBeNull();
  });

  it('keeps picker open and exposes error when model loading fails', async () => {
    const gateway = {
      listModels: jest.fn().mockRejectedValue(new Error('boom')),
    };

    const { result } = renderHook(() =>
      useChatModelPicker({
        connectionState: 'ready',
        gateway,
        sessionKey: 'agent:main:main',
        setInput: jest.fn(),
        setSessions: jest.fn(),
        submitMessage: jest.fn(),
      }),
    );

    expect(result.current.openModelPicker()).toBe(true);
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.modelPickerVisible).toBe(true);
    expect(result.current.modelPickerError).toBe('boom');
    expect(result.current.availableModels).toEqual([]);
  });

  it('fills /model command instead of sending when not ready', () => {
    const setInput = jest.fn();
    const submitMessage = jest.fn();
    let sessions: SessionInfo[] = [
      { key: 'agent:main:main', kind: 'direct', model: 'old', modelProvider: 'openai' },
    ];
    const setSessions = jest.fn((updater: (prev: SessionInfo[]) => SessionInfo[]) => {
      sessions = updater(sessions);
    });

    const { result } = renderHook(() =>
      useChatModelPicker({
        connectionState: 'connecting',
        gateway: { listModels: jest.fn() },
        sessionKey: 'agent:main:main',
        setInput,
        setSessions,
        submitMessage,
      }),
    );

    act(() => {
      result.current.onSelectModel({ id: 'gpt-4o', name: 'gpt-4o', provider: 'openai' });
    });

    expect(setInput).toHaveBeenCalledWith('/model openai/gpt-4o');
    expect(submitMessage).not.toHaveBeenCalled();
    expect(sessions[0].model).toBe('gpt-4o');
    expect(sessions[0].modelProvider).toBe('openai');
    expect(mockedAnalytics.chatModelSelected).toHaveBeenCalledWith({
      provider_model: 'openai/gpt-4o',
      model_id: 'gpt-4o',
      model_name: 'gpt-4o',
      provider: 'openai',
      source: 'chat_model_picker',
      session_key_present: true,
    });
  });

  it('sends /model command when gateway is ready', () => {
    const setInput = jest.fn();
    const submitMessage = jest.fn();
    let sessions: SessionInfo[] = [
      { key: 'agent:main:main', kind: 'direct' },
    ];
    const setSessions = jest.fn((updater: (prev: SessionInfo[]) => SessionInfo[]) => {
      sessions = updater(sessions);
    });

    const { result } = renderHook(() =>
      useChatModelPicker({
        connectionState: 'ready',
        gateway: { listModels: jest.fn() },
        sessionKey: 'agent:main:main',
        setInput,
        setSessions,
        submitMessage,
      }),
    );

    act(() => {
      result.current.onSelectModel({ id: 'gpt-5', name: 'gpt-5', provider: 'openai' });
    });

    expect(submitMessage).toHaveBeenCalledWith('/model openai/gpt-5', []);
    expect(setInput).not.toHaveBeenCalled();
    expect(sessions[0].model).toBe('gpt-5');
    expect(sessions[0].modelProvider).toBe('openai');
  });
});
