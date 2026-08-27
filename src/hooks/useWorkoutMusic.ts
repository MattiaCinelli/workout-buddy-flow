import { useEffect, useRef } from 'react';
import { AmbientPlayer, createAmbientPlayer, createFilePlayer } from '@/lib/ambientAudio';
import { getCustomTrack } from '@/lib/customAudio';

// Runs the guided-workout backing track for as long as `enabled && active`.
// Uses the user's own file when they've set one, otherwise the generated
// ambient bed. Handles the autoplay gate (resume on the next in-page
// gesture) and backgrounding (suspend while hidden).
export const useWorkoutMusic = (enabled: boolean, active: boolean): void => {
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
  }, [enabled, active]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') playerRef.current?.resume();
      else playerRef.current?.suspend();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
};
