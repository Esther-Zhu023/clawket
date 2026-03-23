import { LogEntry, LogLevel, LOG_LEVELS } from '../types/logs';

const LEVELS_SET = new Set<string>(LOG_LEVELS);

function normalizeLevel(value: unknown): LogLevel | null {
  if (typeof value !== 'string') return null;
  const lowered = value.toLowerCase();
  return LEVELS_SET.has(lowered) ? (lowered as LogLevel) : null;
}

function parseMaybeJson(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function parseLogLine(line: string): LogEntry {
  if (!line.trim()) return { raw: line, message: line };
  try {
    const obj = JSON.parse(line) as Record<string, unknown>;
    const meta = obj._meta && typeof obj._meta === 'object' ? (obj._meta as Record<string, unknown>) : null;

    const time = typeof obj.time === 'string'
      ? obj.time
      : typeof meta?.date === 'string'
        ? meta.date
        : null;

    const level = normalizeLevel(meta?.logLevelName ?? meta?.level);

    const contextCandidate = typeof obj['0'] === 'string'
      ? obj['0']
      : typeof meta?.name === 'string'
        ? meta.name
        : null;
    const contextObj = parseMaybeJson(contextCandidate);

    let subsystem: string | null = null;
    if (contextObj) {
      subsystem = typeof contextObj.subsystem === 'string'
        ? contextObj.subsystem
        : typeof contextObj.module === 'string'
          ? contextObj.module
          : null;
    }
    if (!subsystem && contextCandidate && contextCandidate.length < 120) {
      subsystem = contextCandidate;
    }

    let message: string | null = null;
    if (typeof obj['1'] === 'string') {
      message = obj['1'];
    } else if (!contextObj && typeof obj['0'] === 'string') {
      message = obj['0'];
    } else if (typeof obj.message === 'string') {
      message = obj.message;
    }

    return { raw: line, time, level, subsystem, message: message ?? line };
  } catch {
    return { raw: line, message: line };
  }
}
