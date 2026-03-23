import {
  applySpeechRecognitionResult,
  buildSpeechDraftText,
  composeSpeechDraft,
  createSpeechDraftState,
  resolveSpeechLocale,
} from './speechText';

describe('composeSpeechDraft', () => {
  it('returns the transcript when the composer is empty', () => {
    expect(composeSpeechDraft('', 'hello world')).toBe('hello world');
  });

  it('adds a separating space when the composer already has text', () => {
    expect(composeSpeechDraft('Draft', 'hello world')).toBe('Draft hello world');
  });

  it('preserves trailing whitespace from the base text', () => {
    expect(composeSpeechDraft('Draft ', 'hello world')).toBe('Draft hello world');
  });
});

describe('resolveSpeechLocale', () => {
  it('returns null when speech recognition should follow the system language', () => {
    expect(resolveSpeechLocale('system')).toBeNull();
  });

  it('maps the supported locales to Apple speech locales', () => {
    expect(resolveSpeechLocale('zh-Hans')).toBe('zh-CN');
    expect(resolveSpeechLocale('ja')).toBe('ja-JP');
    expect(resolveSpeechLocale('ko')).toBe('ko-KR');
    expect(resolveSpeechLocale('de')).toBe('de-DE');
    expect(resolveSpeechLocale('es')).toBe('es-ES');
    expect(resolveSpeechLocale('en')).toBe('en-US');
  });
});

describe('applySpeechRecognitionResult', () => {
  it('keeps finalized speech when the next volatile segment starts', () => {
    let state = createSpeechDraftState();

    state = applySpeechRecognitionResult(state, 'Hello, can you hear me?', true);
    state = applySpeechRecognitionResult(state, 'This is a test', false);

    expect(buildSpeechDraftText(state)).toBe('Hello, can you hear me? This is a test');
  });

  it('treats cumulative volatile transcripts as replacements for the live segment', () => {
    let state = createSpeechDraftState();

    state = applySpeechRecognitionResult(state, 'Hello', false);
    state = applySpeechRecognitionResult(state, 'Hello can you hear me', false);

    expect(buildSpeechDraftText(state)).toBe('Hello can you hear me');
  });

  it('appends non-cumulative finalized transcripts without dropping prior text', () => {
    let state = createSpeechDraftState();

    state = applySpeechRecognitionResult(state, 'Hello, can you hear me?', true);
    state = applySpeechRecognitionResult(state, 'This is a test.', true);

    expect(buildSpeechDraftText(state)).toBe('Hello, can you hear me? This is a test.');
  });
});
