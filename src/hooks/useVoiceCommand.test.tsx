/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

type Listener = (data: { matches?: string[] }) => void;

const plugin = vi.hoisted(() => ({
  native: true,
  listening: false,
  permission: 'granted' as 'granted' | 'denied' | 'prompt',
  listeners: [] as Listener[],
  start: vi.fn(),
  stop: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => plugin.native } }));
vi.mock('@capacitor-community/speech-recognition', () => ({
  SpeechRecognition: {
    available: async () => ({ available: true }),
    checkPermissions: async () => ({ speechRecognition: plugin.permission }),
    requestPermissions: async () => ({ speechRecognition: plugin.permission === 'prompt' ? 'granted' : plugin.permission }),
    start: async (...args: unknown[]) => { plugin.start(...args); plugin.listening = true; },
    stop: async () => { plugin.stop(); plugin.listening = false; },
    isListening: async () => ({ listening: plugin.listening }),
    addListener: async (_event: string, listener: Listener) => {
      plugin.listeners.push(listener);
      return { remove: async () => { plugin.listeners = plugin.listeners.filter(item => item !== listener); } };
    },
  },
}));

import { useVoiceCommand } from './useVoiceCommand';

const hear = (...matches: string[]) => act(() => { plugin.listeners.forEach(listener => listener({ matches })); });
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });

beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(plugin, { native: true, listening: false, permission: 'granted', listeners: [] });
  plugin.start.mockClear();
  plugin.stop.mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const setup = (overrides: Partial<Parameters<typeof useVoiceCommand>[0]> = {}) => {
  const onCommand = vi.fn();
  const props = { enabled: true, active: true, word: 'next', onCommand, isSpeaking: () => false, ...overrides };
  const hook = renderHook(current => useVoiceCommand(current), { initialProps: props });
  return { onCommand, hook, props };
};

describe('useVoiceCommand', () => {
  it('fires once per spoken command, ignoring the rest of the same utterance', async () => {
    const { onCommand, hook } = setup();
    await flush();
    expect(hook.result.current.status).toBe('listening');

    hear('next');
    hear('next please');
    expect(onCommand).toHaveBeenCalledOnce();
    expect(plugin.stop).toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    hear('Next!');
    expect(onCommand).toHaveBeenCalledTimes(2);
  });

  it('ignores other words and the chosen word only counts', async () => {
    const { onCommand } = setup({ word: 'avanti' });
    await flush();
    hear('next');
    expect(onCommand).not.toHaveBeenCalled();
    hear('Avanti');
    expect(onCommand).toHaveBeenCalledOnce();
  });

  it("does not react to the app's own voice cue", async () => {
    let speaking = true;
    const { onCommand } = setup({ isSpeaking: () => speaking });
    await flush();
    hear('rest changing exercise next up squat');
    expect(onCommand).not.toHaveBeenCalled();
    speaking = false;
    hear('next');
    expect(onCommand).toHaveBeenCalledOnce();
  });

  it('starts a new session after the recogniser stops on silence', async () => {
    setup();
    await flush();
    expect(plugin.start).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    plugin.listening = false; // silence timeout, never reported to JavaScript
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(plugin.start).toHaveBeenCalledTimes(2);
  });

  it('gives up after repeated instant failures', async () => {
    const { hook } = setup();
    await flush();
    plugin.start.mockImplementation(() => { queueMicrotask(() => { plugin.listening = false; }); });
    plugin.listening = false;
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    expect(hook.result.current.status).toBe('error');
    const attempts = plugin.start.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(plugin.start.mock.calls.length).toBe(attempts);
  });

  it('stops listening when inactive and reports a denied microphone', async () => {
    const { hook, props } = setup();
    await flush();
    hook.rerender({ ...props, active: false });
    await flush();
    expect(plugin.stop).toHaveBeenCalled();
    expect(plugin.listeners).toHaveLength(0);
    expect(hook.result.current.status).toBe('off');

    cleanup();
    plugin.permission = 'denied';
    const denied = setup();
    await flush();
    expect(denied.hook.result.current.status).toBe('denied');
    expect(plugin.start).toHaveBeenCalledTimes(1);
  });

  it('does nothing in a browser', async () => {
    plugin.native = false;
    const { hook } = setup();
    await flush();
    expect(hook.result.current.status).toBe('unsupported');
    expect(plugin.start).not.toHaveBeenCalled();
  });
});
