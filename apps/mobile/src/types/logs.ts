export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const LOG_LEVELS: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

export const LOG_LEVEL_BADGE_COLORS: Record<LogLevel, { bg: string; text: string }> = {
  trace: { bg: '#94A3B8', text: '#FFFFFF' },
  debug: { bg: '#60A5FA', text: '#FFFFFF' },
  info: { bg: '#34D399', text: '#064E3B' },
  warn: { bg: '#FBBF24', text: '#78350F' },
  error: { bg: '#F87171', text: '#FFFFFF' },
  fatal: { bg: '#DC2626', text: '#FFFFFF' },
};

export type LogEntry = {
  raw: string;
  time?: string | null;
  level?: LogLevel | null;
  subsystem?: string | null;
  message?: string | null;
};
