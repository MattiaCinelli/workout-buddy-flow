// A calm, generative ambient bed for guided workouts, synthesised entirely
// with the Web Audio API — no audio file, so nothing to license, download,
// or ship, and it works fully offline.
//
// It layers a few detuned sine drones (root / fifth / octave) through a
// slow-breathing low-pass filter, with the occasional soft bell from a
// pentatonic set drifting across the stereo field. Volume sits low so
// spoken rep cues stay clearly on top.

type AudioContextCtor = typeof AudioContext;

const getAudioContextCtor = (): AudioContextCtor | null => {
  if (typeof window === 'undefined') return null;
  return window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
    ?? null;
};

// Low, mellow, roughly A minor pentatonic.
const BELL_HZ = [220, 261.63, 293.66, 349.23, 392.0];

export interface AmbientPlayer {
  start(): Promise<void>;
  stop(): void;
  suspend(): void;
  resume(): void;
  setVolume(value: number): void;
  readonly playing: boolean;
}

export const createAmbientPlayer = (initialVolume = 0.13): AmbientPlayer => {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let filter: BiquadFilterNode | null = null;
  const voices: OscillatorNode[] = [];
  let bellTimer: ReturnType<typeof setTimeout> | null = null;
  let volume = initialVolume;
  let started = false;

  const scheduleBell = () => {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = BELL_HZ[Math.floor(Math.random() * BELL_HZ.length)] * (Math.random() < 0.35 ? 2 : 1);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 6);
    osc.connect(gain);
    const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = Math.random() * 1.4 - 0.7;
      gain.connect(panner);
      panner.connect(master);
    } else {
      gain.connect(master);
    }
    osc.start(now);
    osc.stop(now + 6.2);
    bellTimer = setTimeout(scheduleBell, 9000 + Math.random() * 13000);
  };

  const start = async () => {
    if (started) { resume(); return; }
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;

    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 640;
    filter.Q.value = 0.6;
    filter.connect(master);

    const root = 110; // A2
    for (const [mult, detune, level] of [[1, -4, 0.16], [1.5, 3, 0.13], [2, -2, 0.1], [3, 6, 0.05]] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = root * mult;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      voices.push(osc);
    }

    // ~20s breathing swell on the filter cutoff.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 220;
    lfo.connect(lfoDepth);
    lfoDepth.connect(filter.frequency);
    lfo.start();
    voices.push(lfo);

    await ctx.resume().catch(() => undefined);
    master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2.5);
    started = true;
    scheduleBell();
  };

  const stop = () => {
    if (bellTimer !== null) { clearTimeout(bellTimer); bellTimer = null; }
    const closing = ctx;
    if (closing && master) {
      const t = closing.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + 0.8);
      voices.forEach(osc => { try { osc.stop(t + 1); } catch { /* already stopped */ } });
      setTimeout(() => { void closing.close().catch(() => undefined); }, 1200);
    }
    ctx = null;
    master = null;
    filter = null;
    voices.length = 0;
    started = false;
  };

  const suspend = () => { void ctx?.suspend().catch(() => undefined); };
  const resume = () => { void ctx?.resume().catch(() => undefined); };

  const setVolume = (value: number) => {
    volume = Math.max(0, Math.min(1, value));
    if (ctx && master) master.gain.linearRampToValueAtTime(Math.max(0.0001, volume), ctx.currentTime + 0.3);
  };

  return {
    start,
    stop,
    suspend,
    resume,
    setVolume,
    get playing() { return started; },
  };
};

// Same interface, backed by a looping <audio> element — used when the user
// has supplied their own backing track (see customAudio.ts).
export const createFilePlayer = (blob: Blob, initialVolume = 0.55): AmbientPlayer => {
  const url = URL.createObjectURL(blob);
  const el = typeof Audio === 'function' ? new Audio(url) : null;
  if (el) {
    el.loop = true;
    el.volume = Math.max(0, Math.min(1, initialVolume));
    el.preload = 'auto';
  }
  let started = false;

  return {
    async start() {
      if (!el) return;
      started = true;
      await el.play().catch(() => undefined);
    },
    stop() {
      started = false;
      if (el) { el.pause(); el.removeAttribute('src'); el.load(); }
      URL.revokeObjectURL(url);
    },
    suspend() { el?.pause(); },
    resume() { if (started) void el?.play().catch(() => undefined); },
    setVolume(value: number) { if (el) el.volume = Math.max(0, Math.min(1, value)); },
    get playing() { return started; },
  };
};
