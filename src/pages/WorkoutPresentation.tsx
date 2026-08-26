import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Pause, Play, SkipForward, Timer, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';
import { WorkoutSetResult } from '@/data/workoutSessions';
import { buildWorkoutSteps, remainingSeconds } from '@/lib/workoutRuntime';

type SavedRuntime = { workoutId: string; activeStep: number; startedAt: number; timeLeft: number;
  deadline: number | null; paused: boolean };
type WakeLockLike = { release: () => Promise<void>; released?: boolean };
const runtimeKey = (id: string) => `workout-buddy-active:${id}`;
const VOICE_PREF_KEY = 'workout-buddy-voice-enabled';

const WorkoutPresentation = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { workouts, exercises, workoutsLoading, createSession, completeWorkoutInCourse } = useData();
  const workout = workouts.find(item => item.id === id);
  const steps = useMemo(() => workout ? buildWorkoutSteps(workout, exercises) : [], [workout, exercises]);
  const startedAt = useRef(Date.now());
  const wakeLock = useRef<WakeLockLike | null>(null);
  const advancing = useRef(false);
  const [activeStep, setActiveStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [restored, setRestored] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actualSets, setActualSets] = useState<WorkoutSetResult[]>([]);
  const [rpe, setRpe] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem(VOICE_PREF_KEY) !== 'false');
  const lastSpokenRepRef = useRef<number | null>(null);
  const lastSpokenCountdownRef = useRef<number | null>(null);

  // Drops the announcement (rather than cancelling whatever's currently
  // speaking) when the engine is busy. The "Begin!" cue and the first rep
  // count both fire within milliseconds of each other at the start of every
  // exercise — cancelling meant whichever fired second cut the first off
  // mid-word, and in practice that made "Begin!" essentially never
  // audible. Dropping the odd rep number when they collide is a much
  // smaller loss than losing the announcement it collided with. Queuing
  // instead of dropping was tried too, but then announcements pile up and
  // drift further and further behind the actual countdown.
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    if (window.speechSynthesis.speaking) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.15;
    // Prefer a local (on-device) voice over a network-backed one — some
    // Chromium browsers default to a remote voice (e.g. a "Google US
    // English" that synthesizes audio via a network call) whose events
    // still fire normally even when that network call is blocked or fails,
    // producing complete silence with no error anywhere.
    const localVoice = window.speechSynthesis.getVoices().find(voice => voice.localService);
    if (localVoice) utterance.voice = localVoice;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const toggleVoice = () => {
    setVoiceEnabled(prev => {
      const next = !prev;
      localStorage.setItem(VOICE_PREF_KEY, String(next));
      if (!next) window.speechSynthesis?.cancel();
      return next;
    });
  };

  // getVoices() often returns an empty list until the browser finishes
  // loading them asynchronously — calling it once up front (and again once
  // the list is actually ready) means the very first speak() call, which
  // fires almost immediately on mount, has a real voice list to pick from.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> } };
      if (nav.wakeLock && document.visibilityState === 'visible') wakeLock.current = await nav.wakeLock.request('screen');
    } catch (error) { console.warn('Screen wake lock unavailable:', error); }
  }, []);

  useEffect(() => {
    void requestWakeLock();
    const onVisibility = () => { if (document.visibilityState === 'visible') void requestWakeLock(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.removeEventListener('visibilitychange', onVisibility); void wakeLock.current?.release(); };
  }, [requestWakeLock]);

  useEffect(() => {
    if (!workoutsLoading && !workout) {
      toast({ title: 'Workout not found', description: "The workout you're trying to start doesn't exist.", variant: 'destructive' });
      navigate('/');
    }
  }, [workout, workoutsLoading, navigate, toast]);

  useEffect(() => {
    if (!workout || !steps.length || restored) return;
    const raw = localStorage.getItem(runtimeKey(workout.id));
    let saved: SavedRuntime | null = null;
    try { saved = raw ? JSON.parse(raw) as SavedRuntime : null; } catch { localStorage.removeItem(runtimeKey(workout.id)); }
    if (saved?.workoutId === workout.id && saved.activeStep < steps.length) {
      startedAt.current = saved.startedAt;
      setActiveStep(saved.activeStep);
      setPaused(saved.paused);
      const remaining = saved.deadline && !saved.paused
        ? remainingSeconds(saved.deadline) : saved.timeLeft;
      // A reps-based set never auto-advances (see the tick effect below),
      // so resuming one that had already elapsed shouldn't skip it either
      // — leave the user on it to press Next themselves.
      const savedStep = steps[saved.activeStep];
      const savedIsRepsBased = savedStep?.type === 'exercise' && !!savedStep.secondsPerRep && !!savedStep.reps;
      const restoredStep = remaining === 0 && saved.deadline && !savedIsRepsBased && saved.activeStep + 1 < steps.length
        ? saved.activeStep + 1 : saved.activeStep;
      const restoredDuration = restoredStep === saved.activeStep ? remaining : (steps[restoredStep].duration || 0);
      setActiveStep(restoredStep);
      setTimeLeft(restoredDuration);
      setDeadline(saved.paused || restoredDuration <= 0 ? null : Date.now() + restoredDuration * 1000);
      if (remaining === 0 && saved.deadline && !savedIsRepsBased && saved.activeStep + 1 >= steps.length) setCompletionOpen(true);
      toast({ title: 'Workout resumed', description: 'Continuing from your last saved step.' });
    } else {
      const duration = steps[0].duration || 0;
      setTimeLeft(duration);
      setDeadline(duration ? Date.now() + duration * 1000 : null);
    }
    setActualSets(workout.sets.map((set, setIndex) => ({ exerciseId: set.exerciseId, setIndex,
      completed: true, reps: set.reps, weight: set.weight, duration: set.duration, distance: set.distance })));
    setRestored(true);
  }, [workout, steps, restored, toast]);

  useEffect(() => {
    if (!workout || !restored || completionOpen) return;
    const value: SavedRuntime = { workoutId: workout.id, activeStep, startedAt: startedAt.current, timeLeft, deadline, paused };
    localStorage.setItem(runtimeKey(workout.id), JSON.stringify(value));
  }, [workout, restored, activeStep, timeLeft, deadline, paused, completionOpen]);

  const startStep = useCallback((index: number) => {
    const duration = steps[index]?.duration || 0;
    setActiveStep(index); setTimeLeft(duration); setPaused(false);
    setDeadline(duration ? Date.now() + duration * 1000 : null);
  }, [steps]);

  useEffect(() => {
    advancing.current = false;
    lastSpokenRepRef.current = null;
    lastSpokenCountdownRef.current = null;
  }, [activeStep]);

  // Announces the exercise whenever a new one starts (including the very
  // first, once initial restore/setup has picked the right starting step).
  useEffect(() => {
    if (!restored) return;
    const step = steps[activeStep];
    if (step?.type !== 'exercise') return;
    const ex = exercises.find(item => item.id === step.exerciseId);
    // Deliberately just "Begin", not the exercise name too — the name is
    // already the on-screen heading, and every extra word here is time the
    // engine spends "speaking" (see speak()'s busy check above) during
    // which real rep-count announcements get silently dropped.
    if (ex) speak('Begin');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, restored]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  // Reaching the end opens the completion dialog without changing
  // activeStep, so the effect above never fires to release this guard —
  // closing the dialog (without saving) and pressing Next again would
  // otherwise do nothing forever. Releasing it here covers that path too.
  useEffect(() => { if (!completionOpen) advancing.current = false; }, [completionOpen]);

  const nextStep = useCallback(() => {
    if (advancing.current) return;
    advancing.current = true;
    const next = activeStep + 1;
    if (next >= steps.length) {
      setDeadline(null); setPaused(true); setCompletionOpen(true); return;
    }
    startStep(next);
  }, [activeStep, steps.length, startStep]);

  useEffect(() => {
    if (paused || !deadline || completionOpen) return;
    const update = () => {
      const remaining = remainingSeconds(deadline);
      setTimeLeft(remaining);

      const step = steps[activeStep];
      const isRepsBased = step?.type === 'exercise' && !!step.secondsPerRep && !!step.reps;
      // remaining >= 1 excludes the terminal tick: at exactly 0 the set is
      // already over, so there's nothing left to announce.
      if (step?.type === 'exercise' && step.duration && remaining >= 1) {
        if (isRepsBased) {
          // Reps are always counted up (1, 2, 3…) — never switched to a
          // numeric countdown near the end. A countdown voice implies a
          // fixed time to beat; reps don't have that, so it stays a count.
          const elapsed = step.duration - remaining;
          const repIndex = Math.min(step.reps! - 1, Math.floor(elapsed / step.secondsPerRep!));
          if (lastSpokenRepRef.current !== repIndex) {
            lastSpokenRepRef.current = repIndex;
            speak(String(repIndex + 1));
          }
        } else if (remaining <= 5) {
          // Genuine time-based exercise (a real hold/duration) — count down
          // the last 5 seconds.
          if (lastSpokenCountdownRef.current !== remaining) {
            lastSpokenCountdownRef.current = remaining;
            speak(String(remaining));
          }
        }
      }

      // Reps-based sets don't auto-advance to rest: the countdown is pacing
      // only, since "reps" isn't naturally a fixed time to beat, and the
      // user should decide when they've actually finished the set. Rest
      // steps and genuine time-based exercises still auto-advance.
      if (remaining === 0 && !isRepsBased) nextStep();
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [paused, deadline, completionOpen, nextStep, steps, activeStep, speak]);

  const togglePause = () => {
    if (paused) { setPaused(false); setDeadline(timeLeft > 0 ? Date.now() + timeLeft * 1000 : null); }
    else {
      setTimeLeft(deadline ? remainingSeconds(deadline) : timeLeft);
      setDeadline(null); setPaused(true);
    }
  };

  const updateResult = (index: number, updates: Partial<WorkoutSetResult>) =>
    setActualSets(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item));

  const restartWorkout = () => {
    if (!window.confirm('Start this workout over from the first step?')) return;
    localStorage.removeItem(runtimeKey(workout?.id || id));
    startedAt.current = Date.now();
    startStep(0);
  };

  // Backs out of the whole workout without saving a session — used by both
  // the completion dialog's "Don't save" button and closing that dialog via
  // its X (they're the same action, not "close the dialog but stay").
  const discardAndExit = () => {
    if (!window.confirm("Discard this workout? Your results won't be saved.")) return;
    localStorage.removeItem(runtimeKey(workout?.id || id));
    window.speechSynthesis?.cancel();
    navigate(`/workout/${id}`);
  };

  const saveCompletion = async () => {
    if (!workout || saving) return;
    setSaving(true);
    try {
      const completedAt = new Date().toISOString();
      const courseId = searchParams.get('courseId') || undefined;
      const courseItemId = searchParams.get('courseItemId') || undefined;
      await createSession({ workoutId: workout.id, completedAt, date: completedAt, title: workout.title,
        duration: Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)), plannedDuration: workout.duration,
        category: workout.category, sets: workout.sets, notes: workout.notes, courseId, courseItemId,
        scheduledWorkoutId: searchParams.get('scheduledWorkoutId') || undefined, actualSets,
        perceivedExertion: rpe ? Number(rpe) : undefined, completionNotes: completionNotes.trim() || undefined });
      if (courseId && courseItemId) await completeWorkoutInCourse(courseId, courseItemId);
      localStorage.removeItem(runtimeKey(workout.id));
      toast({ title: 'Workout saved', description: 'Your performance was added to history.' });
      navigate(courseId ? `/courses/${courseId}` : '/history');
    } catch (error) {
      console.error('Failed to save workout:', error);
      toast({ title: 'Could not save workout', description: 'Your resumable workout remains stored on this device.', variant: 'destructive' });
      setSaving(false);
    }
  };

  const current = steps[activeStep];
  const exercise = current?.exerciseId ? exercises.find(item => item.id === current.exerciseId) : undefined;
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  const currentRepNumber = current?.secondsPerRep && current.reps && current.duration
    ? Math.min(current.reps, Math.floor((current.duration - timeLeft) / current.secondsPerRep) + 1)
    : undefined;
  if (!workout || !current) return null;

  return <div className="min-h-screen flex flex-col bg-gray-900 text-white">
    <header className="p-4 flex items-center justify-between">
      <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate(`/workout/${id}`)}><X className="h-6 w-6" /></Button>
      <h1 className="text-xl font-bold">{workout.title}</h1>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="text-white" onClick={toggleVoice} aria-label={voiceEnabled ? 'Mute voice' : 'Unmute voice'}>
          {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="sm" className="text-white" onClick={restartWorkout}>Start over</Button>
      </div>
    </header>
    <div className="px-4"><Progress value={(activeStep / steps.length) * 100} className="h-2" /></div>
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      {current.type === 'exercise' && exercise ? <>
        {exercise.imageUrl && <img src={exercise.imageUrl} alt={exercise.name} className="mb-6 w-full max-w-xs h-48 object-contain rounded-lg" />}
        <div className="text-center mb-8"><h2 className="text-3xl font-bold">{exercise.name}</h2><p className="text-xl text-gray-400">Set {(current.setIndex || 0) + 1}</p>
          {exercise.instructions && <p className="mt-3 max-w-md text-sm text-gray-300">{exercise.instructions}</p>}
          {currentRepNumber !== undefined ? (
            <p className="my-4 text-4xl font-bold">Rep {currentRepNumber} of {current.reps} {current.weight ? `at ${current.weight} lbs` : ''}</p>
          ) : current.reps ? (
            <p className="my-4 text-4xl font-bold">{current.reps} reps {current.weight ? `at ${current.weight} lbs` : ''}</p>
          ) : null}
          {current.duration && <p className="my-4 text-5xl font-bold flex items-center gap-2"><Timer className="h-8 w-8" />{formatTime(timeLeft)}</p>}
        </div>
        <Button size="lg" className="bg-workout-green hover:bg-green-600 text-white" onClick={nextStep}><SkipForward className="h-5 w-5 mr-2" />Next</Button>
      </> : <><h2 className="text-3xl font-bold mb-6">Rest</h2><div className="text-7xl font-bold mb-8">{formatTime(timeLeft)}</div><div className="flex gap-3"><Button size="lg" className="bg-workout-purple text-white" onClick={togglePause}>{paused ? <Play className="mr-2" /> : <Pause className="mr-2" />}{paused ? 'Resume' : 'Pause'}</Button><Button size="lg" variant="outline" className="border-white text-white" onClick={nextStep}>Skip<SkipForward className="ml-2" /></Button></div></>}
    </main>
    <Dialog open={completionOpen} onOpenChange={(open) => { if (!open) discardAndExit(); }}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Log your workout</DialogTitle><DialogDescription>Confirm what you completed. Adjust results or mark skipped sets before saving.</DialogDescription></DialogHeader>
      <div className="space-y-3">{actualSets.map((result, index) => { const planned = workout.sets[index]; const name = exercises.find(item => item.id === result.exerciseId)?.name || 'Exercise'; return <div key={index} className="border rounded-md p-3"><div className="flex items-center gap-2 mb-2"><Checkbox checked={result.completed} onCheckedChange={checked => updateResult(index, { completed: checked === true })} /><span className="font-medium flex-1">{name} · Set {result.setIndex + 1}</span><span className="text-xs text-muted-foreground">{result.completed ? 'Completed' : 'Skipped'}</span></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{planned.reps !== undefined && <div><Label>Reps</Label><Input type="number" min="0" value={result.reps ?? ''} onChange={e => updateResult(index, { reps: Number(e.target.value) })} /></div>}{planned.weight !== undefined && <div><Label>Weight</Label><Input type="number" min="0" step="0.5" value={result.weight ?? ''} onChange={e => updateResult(index, { weight: Number(e.target.value) })} /></div>}{planned.duration !== undefined && <div><Label>Seconds</Label><Input type="number" min="0" value={result.duration ?? ''} onChange={e => updateResult(index, { duration: Number(e.target.value) })} /></div>}{planned.distance !== undefined && <div><Label>Meters</Label><Input type="number" min="0" value={result.distance ?? ''} onChange={e => updateResult(index, { distance: Number(e.target.value) })} /></div>}</div></div>; })}</div>
      <div className="space-y-2"><Label htmlFor="rpe">Perceived exertion (1–10)</Label><Input id="rpe" type="number" min="1" max="10" value={rpe} onChange={e => setRpe(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="completion-notes">Session notes</Label><Textarea id="completion-notes" value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} placeholder="Energy, pain, achievements, substitutions…" /></div>
      <DialogFooter>
        <Button variant="outline" onClick={discardAndExit} disabled={saving}>Don't save</Button>
        <Button onClick={saveCompletion} disabled={saving || (!!rpe && (Number(rpe) < 1 || Number(rpe) > 10))}>{saving ? 'Saving…' : 'Save workout'}</Button>
      </DialogFooter></DialogContent></Dialog>
  </div>;
};

export default WorkoutPresentation;
