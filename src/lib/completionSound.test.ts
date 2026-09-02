/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playCompletionChime } from './completionSound';

describe('playCompletionChime', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('does nothing and never throws when the Web Audio API is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => playCompletionChime()).not.toThrow();
  });

  it('schedules a handful of oscillator notes when an AudioContext exists', () => {
    vi.useFakeTimers();
    const start = vi.fn();
    const stop = vi.fn();
    const connect = vi.fn();
    const makeParam = () => ({
      setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(),
    });
    const ctx = {
      currentTime: 0,
      destination: {},
      close: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn().mockResolvedValue(undefined),
      createGain: () => ({ gain: makeParam(), connect }),
      createOscillator: () => ({ type: '', frequency: { value: 0 }, connect, start, stop }),
    };
    // A plain function (not an arrow) so `new Ctor()` is a valid construct call.
    const Ctor = vi.fn(function AudioContextMock() { return ctx; });
    vi.stubGlobal('AudioContext', Ctor);

    playCompletionChime();

    expect(Ctor).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalled();        // at least one note scheduled
    expect(start.mock.calls.length).toBe(stop.mock.calls.length);
    vi.runAllTimers();
    expect(ctx.close).toHaveBeenCalled();    // context freed afterwards
  });
});
