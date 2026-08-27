import { useEffect, useRef } from 'react';
import { AmbientPlayer, createAmbientPlayer, createFilePlayer } from '@/lib/ambientAudio';
import { getCustomTrack } from '@/lib/customAudio';

// `volume` is the user's 0–1 preference. Each source is scaled from it — a
// raw file plays at that level, the synth bed peaks much lower.
const scaledVolume = (userVolume: number, isFile: boolean) =>
  Math.max(0, Math.min(1, isFile ? userVolume : userVolume * 0.26));

// Runs the guided-workout backing track for as long as `enabled && active`.
// Uses the user's own file when they've set one, otherwise the generated
// ambient bed. Handles the autoplay gate (resume on the next in-page
// gesture) and backgrounding (suspend while hidden).
export const useWorkoutMusic = (enabled: boolean, active: boolean, volume = 0.5): void => {
  const playerRef = useRef<AmbientPlayer | null>(null);

  useEffect(() => {
    if (!enabled || !active) {
      playerRef.current?.stop();
      playerRef.current = null;
      return;
    }

    let cancelled = false;
    void (async () => {
      const custom = await getCustomTrack();
      if (cancelled) return;
      const player = custom ? createFilePlayer(custom.blob) : createAmbientPlayer();
      player.setVolume(scaledVolume(volume, !!custom));
      playerRef.current = player;
      void player.start();
    })();

    const kick = () => playerRef.current?.resume();
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
      playerRef.current?.stop();
      playerRef.current = null;
    };
  }, [enabled, active, volume]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') playerRef.current?.resume();
      else playerRef.current?.suspend();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
};
