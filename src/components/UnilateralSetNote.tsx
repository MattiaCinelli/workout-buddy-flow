import { ArrowLeftRight } from 'lucide-react';

// Shown on a unilateral exercise inside the workout builder so it is clear
// that one authored set already covers BOTH sides: the guided run splits
// each set into left, a short switch pause, then right. Without this cue a
// user who wants "2 per side" adds 4 sets and gets 8 at run time.
export const UnilateralSetNote = () => (
  <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-workout-green">
    <ArrowLeftRight className="h-3 w-3 shrink-0" aria-hidden="true" />
    Each set runs both sides — left, then right. Add one set per pair.
  </p>
);
