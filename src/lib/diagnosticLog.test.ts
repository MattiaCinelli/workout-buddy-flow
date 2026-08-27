import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDiagnostics, formatDiagnostics, getDiagnostics, logDiagnostic } from './diagnosticLog';

const createLocalStorageStub = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
  };
};

beforeEach(() => vi.stubGlobal('localStorage', createLocalStorageStub()));

describe('diagnosticLog', () => {
  it('appends entries and reads them back', () => {
    logDiagnostic('error', 'boom');
    logDiagnostic('warn', 'careful');
    expect(getDiagnostics().map(e => `${e.level}:${e.msg}`)).toEqual(['error:boom', 'warn:careful']);
  });

  it('keeps at most 200 entries (drops the oldest)', () => {
    for (let i = 0; i < 250; i += 1) logDiagnostic('info', `n${i}`);
    const entries = getDiagnostics();
    expect(entries).toHaveLength(200);
    expect(entries[0].msg).toBe('n50');
    expect(entries[199].msg).toBe('n249');
  });

  it('truncates an over-long message', () => {
    logDiagnostic('error', 'x'.repeat(5000));
    expect(getDiagnostics()[0].msg.length).toBe(800);
  });

  it('clear() empties the log; format() still produces a header', () => {
    logDiagnostic('info', 'hi');
    clearDiagnostics();
    expect(getDiagnostics()).toEqual([]);
    expect(formatDiagnostics()).toMatch(/Workout Buddy .*\n\n\(no entries\)/s);
  });
});
