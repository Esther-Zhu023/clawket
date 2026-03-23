import { SpeechRecognitionLanguage } from '../../types';

export type SpeechDraftState = {
  finalTranscript: string;
  liveTranscript: string;
};

export function createSpeechDraftState(): SpeechDraftState {
  return {
    finalTranscript: '',
    liveTranscript: '',
  };
}

export function applySpeechRecognitionResult(
  state: SpeechDraftState,
  transcript: string,
  isFinal: boolean
): SpeechDraftState {
  const normalizedTranscript = normalizeSpeechText(transcript);
  if (!normalizedTranscript) {
    return state;
  }

  if (isFinal) {
    if (startsWithSpeechPrefix(normalizedTranscript, state.finalTranscript)) {
      return {
        finalTranscript: normalizedTranscript,
        liveTranscript: '',
      };
    }
    return {
      finalTranscript: appendDistinctSpeechText(state.finalTranscript, normalizedTranscript),
      liveTranscript: '',
    };
  }

  if (startsWithSpeechPrefix(normalizedTranscript, state.finalTranscript)) {
    const suffix = normalizeSpeechText(normalizedTranscript.slice(state.finalTranscript.length));
    return {
      finalTranscript: state.finalTranscript,
      liveTranscript: suffix,
    };
  }

  if (startsWithSpeechPrefix(normalizedTranscript, state.liveTranscript)) {
    return {
      finalTranscript: state.finalTranscript,
      liveTranscript: normalizedTranscript,
    };
  }

  if (startsWithSpeechPrefix(state.liveTranscript, normalizedTranscript)) {
    return state;
  }

  return {
    finalTranscript: state.finalTranscript,
    liveTranscript: normalizedTranscript,
  };
}

export function composeSpeechDraft(baseText: string, transcript: string): string {
  const normalizedTranscript = normalizeSpeechText(transcript);
  if (!normalizedTranscript) {
    return baseText;
  }
  if (!baseText) {
    return normalizedTranscript;
  }
  return /\s$/.test(baseText) ? `${baseText}${normalizedTranscript}` : `${baseText} ${normalizedTranscript}`;
}

export function buildSpeechDraftText(state: SpeechDraftState): string {
  return appendDistinctSpeechText(state.finalTranscript, state.liveTranscript);
}

function normalizeSpeechText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function startsWithSpeechPrefix(text: string, prefix: string): boolean {
  if (!prefix) {
    return true;
  }
  return text === prefix || text.startsWith(`${prefix} `);
}

function appendDistinctSpeechText(existingText: string, incomingText: string): string {
  const existing = normalizeSpeechText(existingText);
  const incoming = normalizeSpeechText(incomingText);

  if (!existing) {
    return incoming;
  }
  if (!incoming) {
    return existing;
  }
  if (startsWithSpeechPrefix(incoming, existing)) {
    return incoming;
  }
  if (startsWithSpeechPrefix(existing, incoming)) {
    return existing;
  }

  const existingWords = existing.split(' ');
  const incomingWords = incoming.split(' ');
  const overlapLimit = Math.min(existingWords.length, incomingWords.length);

  for (let size = overlapLimit; size > 0; size -= 1) {
    const existingSuffix = existingWords.slice(-size).join(' ');
    const incomingPrefix = incomingWords.slice(0, size).join(' ');
    if (existingSuffix === incomingPrefix) {
      const remainder = incomingWords.slice(size).join(' ');
      return remainder ? `${existing} ${remainder}` : existing;
    }
  }

  return `${existing} ${incoming}`;
}

export function resolveSpeechLocale(language: SpeechRecognitionLanguage | string | null | undefined): string | null {
  if (!language || language === 'system') {
    return null;
  }
  if (language.startsWith('zh')) {
    return 'zh-CN';
  }
  if (language === 'ja') {
    return 'ja-JP';
  }
  if (language === 'ko') {
    return 'ko-KR';
  }
  if (language === 'de') {
    return 'de-DE';
  }
  if (language === 'es') {
    return 'es-ES';
  }
  return 'en-US';
}
