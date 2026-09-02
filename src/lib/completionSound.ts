// A short rising major arpeggio ("ta-daa") played once when a workout is
// finished, to mark the moment. Synthesised with the Web Audio API — no
// asset to ship, works offline. Fire-and-forget: any failure (no audio
// hardware, autoplay policy, SSR) is swallowed silently.

type AudioContextCtor = typeof AudioContext;

const getAudioContextCtor = (): AudioContextCtor | null => {
  if (typeof window === 'undefined') return null;
  return window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
    ?? null;
};

// C5 · E5 · G5 · C6, the last note held longer — a plain, happy major triad.
const NOTES_HZ = [523.25, 659.25, 783.99, 1046.5];
const NOTE_SPACING_S = 0.13;

export const playCompletionChime = (volume = 0.22): void => {
  try {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = Math.max(0, Math.min(1, volume));
    master.connect(ctx.destination);

    NOTES_HZ.forEach((hz, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = hz;
      const startAt = ctx.currentTime + index * NOTE_SPACING_S;
      const duration = index === NOTES_HZ.length - 1 ? 0.9 : 0.26;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(1, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.05);
    });

    void ctx.resume().catch(() => undefined);
    // Free the context once the sound has finished.
    setTimeout(() => { void ctx.close().catch(() => undefined); },
      (NOTES_HZ.length * NOTE_SPACING_S + 1.3) * 1000);
  } catch {
    /* no audio available — the workout still completes silently */
  }
};
