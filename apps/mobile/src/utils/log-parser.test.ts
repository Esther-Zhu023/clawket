import { parseLogLine } from './log-parser';

describe('parseLogLine', () => {
  it('returns raw line as message for empty/whitespace input', () => {
    const result = parseLogLine('');
    expect(result.raw).toBe('');
    expect(result.message).toBe('');
  });

  it('returns raw line as message for plain text', () => {
    const result = parseLogLine('plain text log line');
    expect(result.raw).toBe('plain text log line');
    expect(result.message).toBe('plain text log line');
  });

  it('returns raw line for invalid JSON', () => {
    const result = parseLogLine('{invalid json}');
    expect(result.raw).toBe('{invalid json}');
    expect(result.message).toBe('{invalid json}');
  });

  it('parses JSON with message field', () => {
    const line = JSON.stringify({ message: 'hello world' });
    const result = parseLogLine(line);
    expect(result.message).toBe('hello world');
  });

  it('extracts time from top-level time field', () => {
    const line = JSON.stringify({ time: '2024-01-15T10:00:00Z', message: 'test' });
    const result = parseLogLine(line);
    expect(result.time).toBe('2024-01-15T10:00:00Z');
  });

  it('extracts time from _meta.date', () => {
    const line = JSON.stringify({ _meta: { date: '2024-01-15T10:00:00Z' }, message: 'test' });
    const result = parseLogLine(line);
    expect(result.time).toBe('2024-01-15T10:00:00Z');
  });

  it('extracts level from _meta.logLevelName', () => {
    const line = JSON.stringify({ _meta: { logLevelName: 'ERROR' }, message: 'fail' });
    const result = parseLogLine(line);
    expect(result.level).toBe('error');
  });

  it('extracts level from _meta.level', () => {
    const line = JSON.stringify({ _meta: { level: 'WARN' }, message: 'warning' });
    const result = parseLogLine(line);
    expect(result.level).toBe('warn');
  });

  it('returns null level for unknown level string', () => {
    const line = JSON.stringify({ _meta: { logLevelName: 'UNKNOWN' }, message: 'test' });
    const result = parseLogLine(line);
    expect(result.level).toBeNull();
  });

  it('extracts subsystem from _meta.name', () => {
    const line = JSON.stringify({ _meta: { name: 'mySubsystem' }, message: 'test' });
    const result = parseLogLine(line);
    expect(result.subsystem).toBe('mySubsystem');
  });

  it('extracts message from positional key "1"', () => {
    const line = JSON.stringify({ '0': 'context', '1': 'actual message' });
    const result = parseLogLine(line);
    expect(result.message).toBe('actual message');
  });

  it('uses positional key "0" as message when no "1" and not JSON context', () => {
    const line = JSON.stringify({ '0': 'simple message' });
    const result = parseLogLine(line);
    expect(result.message).toBe('simple message');
  });

  it('extracts subsystem from JSON context in key "0"', () => {
    const ctx = JSON.stringify({ subsystem: 'gateway' });
    const line = JSON.stringify({ '0': ctx, '1': 'msg' });
    const result = parseLogLine(line);
    expect(result.subsystem).toBe('gateway');
    expect(result.message).toBe('msg');
  });

  it('extracts module from JSON context in key "0"', () => {
    const ctx = JSON.stringify({ module: 'auth' });
    const line = JSON.stringify({ '0': ctx, '1': 'msg' });
    const result = parseLogLine(line);
    expect(result.subsystem).toBe('auth');
  });

  it('falls back to raw line as message when no message field found', () => {
    const line = JSON.stringify({ someKey: 123 });
    const result = parseLogLine(line);
    expect(result.message).toBe(line);
  });
});
