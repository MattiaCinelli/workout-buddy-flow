import { useEffect, useRef, useState } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { matchesCommand } from '@/lib/voiceCommand';

// Hands-free "next" for guided workouts, on the Android app only. A browser
// could use webkitSpeechRecognition, but Chrome sends that audio to Google's
// servers, which breaks the app's promise that nothing leaves the device.
//
// Android's recogniser listens in short sessions: it ends after a pause in
// speech or a few seconds of silence. With partial results on, the plugin
// resolves start() immediately and never reports those silent endings to
// JavaScript, so a light poll of isListening() keeps listening alive instead
// of waiting for events that do not come.

export type VoiceCommandStatus = 'off' | 'unsupported' | 'denied' | 'listening' | 'error';
export type MicrophonePermission = 'granted' | 'denied' | 'unavailable';

const POLL_MS = 500;
// After a session ends, the recogniser can still deliver its final result;
// restarting straight away would destroy it, so wait a moment first.
const RESTART_GRACE_MS = 1000;
// One spoken "next" produces several partial results and a final result.
const COOLDOWN_MS = 1500;
// A session that ends this quickly never heard anything — the recogniser
// failed (busy, no network model, …). Back off so it is not hammered.
const SHORT_SESSION_MS = 1500;
const MAX_CONSECUTIVE_FAILURES = 10;

export const isVoiceControlSupported = (): boolean => Capacitor.isNativePlatform();

/** Asks for the microphone only when needed; safe to call repeatedly. */
export const ensureMicrophonePermission = async (): Promise<MicrophonePermission> => {
  if (!isVoiceControlSupported()) return 'unavailable';
  try {
    const { available } = await SpeechRecognition.available();
    if (!available) return 'unavailable';
    let status = await SpeechRecognition.checkPermissions();
    if (status.speechRecognition !== 'granted') status = await SpeechRecognition.requestPermissions();
    return status.speechRecognition === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
};

interface UseVoiceCommandOptions {
  enabled: boolean;
  /** False while nothing should be listened for, e.g. the completion dialog is open. */
  active: boolean;
  word: string;
  onCommand: () => void;
  /** True while the app's own voice cue is playing (plus a short tail). */
  isSpeaking: () => boolean;
}

export const useVoiceCommand = ({ enabled, active, word, onCommand, isSpeaking }: UseVoiceCommandOptions) => {
  const [status, setStatus] = useState<VoiceCommandStatus>('off');
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden');
  const latest = useRef({ word, onCommand, isSpeaking });
  latest.current = { word, onCommand, isSpeaking };

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const run = enabled && active && visible;

  useEffect(() => {
    if (!enabled) { setStatus('off'); return; }
    if (!isVoiceControlSupported()) { setStatus('unsupported'); return; }
    if (!run) { setStatus(current => (current === 'listening' ? 'off' : current)); return; }

    let cancelled = false;
    let timer: number | undefined;
    const handles: PluginListenerHandle[] = [];
    let starting = false;
    let failures = 0;
    let sessionStartedAt = 0;
    let stoppedSince: number | null = null;
    let nextAttemptAt = 0;
    let cooldownUntil = 0;

    const keep = (handle: PluginListenerHandle) => {
      if (cancelled) void handle.remove();
      else handles.push(handle);
    };

    const giveUp = () => {
      window.clearInterval(timer);
      setStatus('error');
    };

    const start = async () => {
      starting = true;
      try {
        await SpeechRecognition.start({ language: navigator.language, maxResults: 5, partialResults: true, popup: false });
        sessionStartedAt = Date.now();
        // Cleanup may have run while start() was in flight; its stop() came
        // too early to reach this new session.
        if (cancelled) void SpeechRecognition.stop().catch(() => undefined);
        else setStatus('listening');
      } catch {
        failures += 1;
        nextAttemptAt = Date.now() + Math.min(1000 * 2 ** (failures - 1), 5000);
        if (failures >= MAX_CONSECUTIVE_FAILURES) giveUp();
      } finally {
        starting = false;
        stoppedSince = null;
      }
    };

    const poll = async () => {
      if (cancelled || starting) return;
      let listening = false;
      try { ({ listening } = await SpeechRecognition.isListening()); } catch { /* treat as stopped */ }
      if (cancelled) return;
      const now = Date.now();
      if (listening) { stoppedSince = null; return; }
      if (stoppedSince === null) {
        stoppedSince = now;
        if (now - sessionStartedAt < SHORT_SESSION_MS) {
          failures += 1;
          nextAttemptAt = now + Math.min(1000 * 2 ** (failures - 1), 5000);
          if (failures >= MAX_CONSECUTIVE_FAILURES) { giveUp(); return; }
        } else {
          failures = 0;
        }
        return;
      }
      if (now - stoppedSince < RESTART_GRACE_MS || now < nextAttemptAt) return;
      await start();
    };

    void (async () => {
      const permission = await ensureMicrophonePermission();
      if (cancelled) return;
      if (permission !== 'granted') { setStatus(permission === 'denied' ? 'denied' : 'unsupported'); return; }
      keep(await SpeechRecognition.addListener('partialResults', ({ matches }) => {
        const now = Date.now();
        if (now < cooldownUntil || latest.current.isSpeaking()) return;
        if (!matchesCommand(matches ?? [], latest.current.word)) return;
        cooldownUntil = now + COOLDOWN_MS;
        latest.current.onCommand();
        // End this utterance so the rest of it cannot fire again; the poll
        // starts a fresh session after the grace period.
        void SpeechRecognition.stop().catch(() => undefined);
      }));
      if (cancelled) return;
      await start();
      if (cancelled) return;
      timer = window.setInterval(() => void poll(), POLL_MS);
    })();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      handles.forEach(handle => void handle.remove());
      void SpeechRecognition.stop().catch(() => undefined);
    };
  }, [enabled, run]);

  return { status };
};
