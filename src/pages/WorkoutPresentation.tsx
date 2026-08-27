import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { ChevronLeft, Minus, Pause, Play, Plus, SkipForward, Timer, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';
import { WorkoutSetResult } from '@/data/workoutSessions';
import { buildWorkoutSteps, remainingSeconds } from '@/lib/workoutRuntime';
import { detectNewPersonalRecords, PRKind } from '@/lib/personalRecords';

const PR_UNIT: Record<PRKind, string> = { weight: 'kg', reps: 'reps', duration: 'sec', distance: 'm' };
const PR_LABEL: Record<PRKind, string> = { weight: 'weight', reps: 'reps', duration: 'time', distance: 'distance' };

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
  const { workouts, exercises, sessions, workoutsLoading, createSession, completeWorkoutInCourse } = useData();
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
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actualSets, setActualSets] = useState<WorkoutSetResult[]>([]);
  const [rpe, setRpe] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem(VOICE_PREF_KEY) !== 'false');
  const lastSpokenRepRef = useRef<number | null>(null);
  const lastSpokenCountdownRef = useRef<number | null>(null);

  // A step transition is announced by voice AND felt as a vibration, so
  // the workout stays followable even when speech synthesis is unreliable
  // (browser/OS-dependent — see the voice troubleshooting from earlier).
  // Capacitor's web implementation of Haptics.impact() uses the Vibration
  // API, which works on mobile browsers and the Android WebView but
  // rejects on desktop (no vibration hardware) — the catch is that, not an
  // error worth surfacing.
  const vibrate = useCallback((style: ImpactStyle) => {
    Haptics.impact({ style }).catch(() => undefined);
  }, []);

  // Uses the native TTS engine on iOS/Android (via a Capacitor plugin)
  // rather than the browser's SpeechSynthesis API directly — Android's
  // WebView (what this app runs in once installed) doesn't implement
  // SpeechSynthesis at all, only full browsers do. The plugin's web
  // fallback still uses SpeechSynthesis under the hood, so behavior in a
  // desktop/mobile browser is unchanged. Each call interrupts whatever is
  // currently speaking (the plugin's default queue strategy), which is
  // exactly what rapid rep-counting needs — no manual busy-tracking or
  // watchdog timers required, unlike the raw Web Speech API.
  const speak = useCallback((text: string) => {
    if (!voiceEnabled) return;
    TextToSpeech.speak({ text, rate: 1.15 }).catch((error: unknown) => {
      // Every new cue interrupts whatever's still speaking (QueueStrategy's
      // default, Flush) — on web that surfaces as the PREVIOUS call's
      // promise rejecting with error "interrupted". That's this function
      // working as intended, not a failure, so it's not worth logging.
      const isSelfInterruption = typeof error === 'object' && error !== null
        && 'error' in error && (error as { error?: string }).error === 'interrupted';
      if (!isSelfInterruption) console.error(`Speech synthesis failed for "${text}":`, error);
    });
  }, [voiceEnabled]);

  const toggleVoice = () => {
    setVoiceEnabled(prev => {
      const next = !prev;
      localStorage.setItem(VOICE_PREF_KEY, String(next));
      if (!next) void TextToSpeech.stop().catch(() => undefined);
      return next;
    });
  };

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

  useEffect(() => {
    if (!restored) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [restored]);

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

  // Announces whenever a new step starts (including the very first, once
  // initial restore/setup has picked the right starting step) — "Get
  // ready" for the leading prep pause, "Start rest" for an ordinary rest,
  // "Begin" for an exercise. This is the only place any of these fire, so
  // there's exactly one announcement per step, never a duplicate.
  useEffect(() => {
    if (!restored) return;
    const step = steps[activeStep];
    if (step?.type === 'exercise') {
      const ex = exercises.find(item => item.id === step.exerciseId);
      // Deliberately just "Begin", not the exercise name too — the name is
      // already the on-screen heading, and every extra word here is time
      // the engine spends "speaking" during which real rep-count
      // announcements would otherwise get interrupted.
      if (ex) speak('Begin');
    } else if (step?.type === 'rest') {
      speak(step.kind === 'prep' ? 'Get ready' : 'Start rest');
    }
  }, [activeStep, restored, steps, exercises, speak]);

  // A distinct buzz per step type, independent of voice readiness — this
  // is the fallback, so it shouldn't wait on anything voice-related.
  useEffect(() => {
    if (!restored) return;
    const step = steps[activeStep];
    if (step?.type === 'exercise') vibrate(ImpactStyle.Heavy);
    else if (step?.type === 'rest') vibrate(step.kind === 'prep' ? ImpactStyle.Light : ImpactStyle.Medium);
  }, [activeStep, restored, steps, vibrate]);

  useEffect(() => () => { void TextToSpeech.stop().catch(() => undefined); }, []);
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

  const previousStep = () => {
    if (activeStep === 0) return;
    void TextToSpeech.stop().catch(() => undefined);
    startStep(activeStep - 1);
  };

  useEffect(() => {
    if (paused || !deadline || completionOpen) return;
    const update = () => {
      const remaining = remainingSeconds(deadline);
      setTimeLeft(remaining);

      const step = steps[activeStep];
      const isRepsBased = step?.type === 'exercise' && !!step.secondsPerRep && !!step.reps;
      // remaining >= 1 excludes the terminal tick: at exactly 0 the step is
      // already over, so there's nothing left to announce. Applies to any
      // step with a real duration to count down — a timed exercise, a rest,
      // or the leading prep pause — reps-based exercises are the only
      // exception (handled separately below).
      if (step?.duration && remaining >= 1) {
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
          // Genuine time-based exercise, rest, or the prep pause — count
          // down the last 5 seconds.
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

  // Only meaningful during rest/prep — adjusts however much time is left
  // rather than the step's original duration, so repeated taps keep
  // stacking correctly whether the timer is running or paused.
  const adjustRestTime = (deltaSeconds: number) => {
    if (paused) {
      setTimeLeft(prev => Math.max(0, prev + deltaSeconds));
    } else {
      setDeadline(prev => (prev === null ? prev : prev + deltaSeconds * 1000));
    }
  };

  const updateResult = (index: number, updates: Partial<WorkoutSetResult>) =>
    setActualSets(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item));

  const restartWorkout = () => {
    localStorage.removeItem(runtimeKey(workout?.id || id));
    startedAt.current = Date.now();
    startStep(0);
    setRestartConfirmOpen(false);
  };

  // Backs out of the whole workout without saving a session — used by both
  // the completion dialog's "Don't save" button and closing that dialog via
  // its X (they're the same action, not "close the dialog but stay").
  const discardAndExit = () => {
    localStorage.removeItem(runtimeKey(workout?.id || id));
    void TextToSpeech.stop().catch(() => undefined);
    navigate(`/workouts/${id}`);
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

      // Compare against sessions as they stood BEFORE this one was added —
      // `sessions` here is still the pre-save snapshot, since the context
      // hasn't refreshed yet at this point in the same tick. All PRs (and
      // the save confirmation) go into ONE toast call — this app's toast
      // hook caps display at a single toast (TOAST_LIMIT = 1 in
      // use-toast.ts), so separate sequential calls would just have each
      // one instantly replace the last, silently dropping every PR.
      const newRecords = detectNewPersonalRecords(actualSets, sessions);
      toast({
        title: newRecords.length > 0 ? 'Workout saved — new personal record!' : 'Workout saved',
        description: newRecords.length === 0 ? 'Your performance was added to history.' : (
          <div className="space-y-1">
            <p>Your performance was added to history.</p>
            {newRecords.map(record => {
              const exerciseName = exercises.find(item => item.id === record.exerciseId)?.name ?? 'Exercise';
              return (
                <p key={`${record.exerciseId}-${record.kind}`}>
                  {exerciseName} {PR_LABEL[record.kind]}: {record.value} {PR_UNIT[record.kind]}
                  {' '}(previous best {record.previousValue} {PR_UNIT[record.kind]})
                </p>
              );
            })}
          </div>
        ),
      });
      navigate(courseId ? `/courses/${courseId}` : '/history');
    } catch (error) {
      console.error('Failed to save workout:', error);
      toast({ title: 'Could not save workout', description: 'Your resumable workout remains stored on this device.', variant: 'destructive' });
      setSaving(false);
    }
  };

  const current = steps[activeStep];
  const upcoming = steps[activeStep + 1];
  const exercise = current?.exerciseId ? exercises.find(item => item.id === current.exerciseId) : undefined;
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  const remainingWorkoutSeconds = timeLeft + steps.slice(activeStep + 1)
    .reduce((total, step) => total + (step.duration || 0), 0);
  const activeSetNumber = ((current?.sourceSetIndex ?? steps[activeStep - 1]?.sourceSetIndex) ?? 0) + 1;
  const upcomingLabel = upcoming?.type === 'rest'
    ? `Rest · ${formatTime(upcoming.duration || 0)}`
    : upcoming?.exerciseId
      ? exercises.find(item => item.id === upcoming.exerciseId)?.name || 'Exercise'
      : 'Finish workout';
  const currentRepNumber = current?.secondsPerRep && current.reps && current.duration
    ? Math.min(current.reps, Math.floor((current.duration - timeLeft) / current.secondsPerRep) + 1)
    : undefined;
  const resultsValid = actualSets.every(result =>
    (result.reps === undefined || (result.reps >= 0 && result.reps <= 1000)) &&
    (result.weight === undefined || (result.weight >= 0 && result.weight <= 1000)) &&
    (result.duration === undefined || (result.duration >= 0 && result.duration <= 86400)) &&
    (result.distance === undefined || (result.distance >= 0 && result.distance <= 1000000))
  );
  if (!workout || !current) return null;

  return <div className="min-h-[100dvh] flex flex-col bg-gray-900 text-white">
    <header className="p-3 sm:p-4 flex items-center justify-between gap-2">
      <Button variant="ghost" size="icon" className="text-white shrink-0" onClick={() => setExitConfirmOpen(true)} aria-label="Exit workout"><X className="h-6 w-6" /></Button>
      <h1 className="text-lg sm:text-xl font-bold truncate">{workout.title}</h1>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="text-white" onClick={toggleVoice} aria-label={voiceEnabled ? 'Mute workout voice' : 'Unmute workout voice'}>
          {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="sm" className="text-white" onClick={() => setRestartConfirmOpen(true)}>Restart</Button>
      </div>
    </header>
    <section className="px-4 space-y-2" aria-label="Workout progress">
      <div className="flex justify-between text-xs sm:text-sm text-gray-300">
        <span>{current.kind === 'prep' ? 'Getting started' : `Set ${activeSetNumber} of ${workout.sets.length}`}</span>
        <span>About {formatTime(remainingWorkoutSeconds)} remaining</span>
      </div>
      <Progress value={((activeStep + 1) / steps.length) * 100} className="h-2" aria-label={`Step ${activeStep + 1} of ${steps.length}`} />
      <p className="text-center text-sm text-gray-300">Next: {upcomingLabel}</p>
    </section>
    <main className="flex-1 flex flex-col items-center justify-center p-4 pb-28">
      {current.type === 'exercise' && exercise ? <>
        {exercise.imageUrl && <img src={exercise.imageUrl} alt={exercise.name} className="mb-6 w-full max-w-xs h-48 object-contain rounded-lg" />}
        <div className="text-center mb-8"><h2 className="text-3xl font-bold" aria-live="polite">{exercise.name}</h2><p className="text-xl text-gray-400">Exercise set {(current.setIndex || 0) + 1}</p>
          {exercise.instructions && <p className="mt-3 max-w-md text-sm text-gray-300">{exercise.instructions}</p>}
          {currentRepNumber !== undefined ? (
            <p className="my-4 text-4xl font-bold">Rep {currentRepNumber} of {current.reps} {current.weight ? `at ${current.weight} kg` : ''}</p>
          ) : current.reps ? (
            <p className="my-4 text-4xl font-bold">{current.reps} reps {current.weight ? `at ${current.weight} kg` : ''}</p>
          ) : null}
          {current.duration && <p className="my-4 text-5xl font-bold flex items-center gap-2" role="timer" aria-label={`${timeLeft} seconds remaining`}><Timer className="h-8 w-8" aria-hidden="true" />{formatTime(timeLeft)}</p>}
        </div>
      </> : <>
        <h2 className="text-3xl font-bold mb-2" aria-live="polite">{current.kind === 'prep' ? 'Get Ready' : 'Rest'}</h2>
        {current.kind === 'prep' && <p className="text-gray-400 mb-4">Get into position — your workout starts in a moment.</p>}
        <div className="text-7xl font-bold mb-8" role="timer" aria-label={`${timeLeft} seconds ${current.kind === 'prep' ? 'until start' : 'of rest remaining'}`}>{formatTime(timeLeft)}</div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-white/40 bg-transparent text-white" onClick={() => adjustRestTime(-15)} aria-label="Subtract 15 seconds">
            <Minus className="mr-1 h-4 w-4" />15s
          </Button>
          <Button variant="outline" className="border-white/40 bg-transparent text-white" onClick={() => adjustRestTime(15)} aria-label="Add 15 seconds">
            <Plus className="mr-1 h-4 w-4" />15s
          </Button>
        </div>
      </>}
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 gap-2 border-t border-white/15 bg-gray-900/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur" aria-label="Workout controls">
      <Button size="lg" variant="outline" className="h-14 border-white/40 bg-transparent text-white" onClick={previousStep} disabled={activeStep === 0}><ChevronLeft className="mr-1 h-5 w-5" />Previous</Button>
      <Button size="lg" className="h-14 bg-workout-purple text-white" onClick={togglePause}>{paused ? <Play className="mr-1 h-5 w-5" /> : <Pause className="mr-1 h-5 w-5" />}{paused ? 'Resume' : 'Pause'}</Button>
      <Button size="lg" className="h-14 bg-workout-green text-white hover:bg-green-600" onClick={nextStep}>{activeStep === steps.length - 1 ? 'Finish' : current.kind === 'prep' ? "I'm ready" : current.type === 'rest' ? 'Skip rest' : 'Next'}<SkipForward className="ml-1 h-5 w-5" /></Button>
    </nav>
    <Dialog open={completionOpen} onOpenChange={(open) => { if (!open) setExitConfirmOpen(true); }}><DialogContent className="h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg"><DialogHeader><DialogTitle>Complete workout</DialogTitle><DialogDescription>Confirm what you completed. Adjust results or mark skipped sets before saving.</DialogDescription></DialogHeader>
      <div className="space-y-3">{actualSets.map((result, index) => { const planned = workout.sets[index]; const name = exercises.find(item => item.id === result.exerciseId)?.name || 'Exercise'; return <div key={index} className="border rounded-md p-3"><div className="flex items-center gap-2 mb-2"><Checkbox id={`completed-${index}`} checked={result.completed} onCheckedChange={checked => updateResult(index, { completed: checked === true })} /><Label htmlFor={`completed-${index}`} className="font-medium flex-1">{name} · Set {result.setIndex + 1}</Label><span className="text-xs text-muted-foreground">{result.completed ? 'Completed' : 'Skipped'}</span></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{planned.reps !== undefined && <div><Label htmlFor={`result-reps-${index}`}>Reps</Label><Input id={`result-reps-${index}`} type="number" min="0" max="1000" value={result.reps ?? ''} onChange={e => updateResult(index, { reps: Number(e.target.value) })} /></div>}{planned.weight !== undefined && <div><Label htmlFor={`result-weight-${index}`}>Weight (kg)</Label><Input id={`result-weight-${index}`} type="number" min="0" max="1000" step="0.5" value={result.weight ?? ''} onChange={e => updateResult(index, { weight: Number(e.target.value) })} /></div>}{planned.duration !== undefined && <div><Label htmlFor={`result-duration-${index}`}>Seconds</Label><Input id={`result-duration-${index}`} type="number" min="0" max="86400" value={result.duration ?? ''} onChange={e => updateResult(index, { duration: Number(e.target.value) })} /></div>}{planned.distance !== undefined && <div><Label htmlFor={`result-distance-${index}`}>Distance (m)</Label><Input id={`result-distance-${index}`} type="number" min="0" max="1000000" value={result.distance ?? ''} onChange={e => updateResult(index, { distance: Number(e.target.value) })} /></div>}</div></div>; })}</div>
      <div className="space-y-2"><Label htmlFor="rpe">Perceived exertion (1–10)</Label><Input id="rpe" type="number" min="1" max="10" value={rpe} onChange={e => setRpe(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="completion-notes">Session notes</Label><Textarea id="completion-notes" value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} placeholder="Energy, pain, achievements, substitutions…" /></div>
      {!resultsValid && <p className="text-sm text-destructive" role="alert">Check the entered workout values before saving.</p>}
      <DialogFooter className="sticky bottom-0 bg-background py-3">
        <Button variant="outline" onClick={() => setExitConfirmOpen(true)} disabled={saving}>Discard</Button>
        <Button onClick={saveCompletion} disabled={saving || !resultsValid || (!!rpe && (Number(rpe) < 1 || Number(rpe) > 10))}>{saving ? 'Saving…' : 'Save workout'}</Button>
      </DialogFooter></DialogContent></Dialog>
    <AlertDialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard this workout?</AlertDialogTitle><AlertDialogDescription>Your progress and results for this active workout will not be saved.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Continue workout</AlertDialogCancel><AlertDialogAction onClick={discardAndExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Discard and exit</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={restartConfirmOpen} onOpenChange={setRestartConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Restart workout?</AlertDialogTitle><AlertDialogDescription>This returns to the first set and resets the workout timer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={restartWorkout}>Restart</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
};

export default WorkoutPresentation;
