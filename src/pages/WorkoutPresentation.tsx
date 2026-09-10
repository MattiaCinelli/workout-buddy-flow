import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, CheckCircle2, ChevronLeft, Dumbbell, Info, Minus, Music, Pause, Play, Plus, RotateCcw, SkipForward, Timer, Video, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PlateCalculator } from '@/components/PlateCalculator';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';
import { WorkoutSetResult } from '@/data/workoutSessions';
import { buildWorkoutSteps, isSelfPacedStep, remainingSeconds, restKindLabel, stepClockSeconds, stepStartAnnouncement } from '@/lib/workoutRuntime';
import { playCompletionChime } from '@/lib/completionSound';
import { logDiagnostic } from '@/lib/diagnosticLog';
import { computePersonalRecords, detectNewPersonalRecords, PersonalRecord, PRKind } from '@/lib/personalRecords';
import { exerciseSessionHistory, formatLoggedDistance, formatLoggedDuration } from '@/lib/exerciseHistory';
import { suggestNextSet } from '@/lib/progression';
import { ToastAction } from '@/components/ui/toast';
import { getAccessibilitySettings, setAccessibilitySettings } from '@/lib/accessibilitySettings';
import { useWorkoutMusic } from '@/hooks/useWorkoutMusic';
import { workoutDirectionLabel } from '@/lib/workoutDirections';
import { getNextSameDayWorkout } from '@/lib/courseSchedule';
import ExerciseImage from '@/components/ExerciseImage';
import { getExerciseImageUrl } from '@/data/exercises';

const PR_UNIT: Record<PRKind, string> = { weight: 'kg', reps: 'reps', duration: 'sec', distance: 'm' };
const PR_LABEL: Record<PRKind, string> = { weight: 'weight', reps: 'reps', duration: 'time', distance: 'distance' };

// The single headline number for a "PR" badge — whichever dimension this
// exercise is actually measured in.
const bestRecordLabel = (record?: PersonalRecord): string | null => {
  if (!record) return null;
  if (record.maxWeight) return `${record.maxWeight.value} kg`;
  if (record.maxDuration) return formatLoggedDuration(record.maxDuration.value);
  if (record.maxDistance) return formatLoggedDistance(record.maxDistance.value);
  if (record.maxReps) return `${record.maxReps.value} reps`;
  return null;
};

type SavedRuntime = { workoutId: string; activeStep: number; startedAt: number; timeLeft: number;
  deadline: number | null; paused: boolean; activeElapsedMs?: number; activeSince?: number | null;
  actualSets?: WorkoutSetResult[]; rpe?: string; completionNotes?: string; completionOpen?: boolean };
type WakeLockLike = { release: () => Promise<void>; released?: boolean };
const runtimeKey = (id: string, occurrenceIdentity: string) =>
  `workout-buddy-active:${id}${occurrenceIdentity ? `:${encodeURIComponent(occurrenceIdentity)}` : ''}`;

// A left-to-right fill that mirrors the numeric countdown, so time
// remaining is readable at a glance without parsing digits. Colours are
// passed in (`tone`) because the same bar is reused on the dark exercise
// screen and the rest screen with different accents.
const CountdownBar = ({ percent, tone }: { percent: number; tone: string }) => (
  <div className="mx-auto w-full max-w-xs h-2 overflow-hidden rounded-full bg-white/15"
    role="progressbar" aria-label="Time elapsed"
    aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
    <div className={`h-full ${tone} transition-[width] duration-200 ease-linear`}
      style={{ width: `${percent}%` }} />
  </div>
);

const WorkoutPresentation = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const {
    workouts, exercises, sessions, workoutsLoading, createSession, deleteSession,
    completeWorkoutInCourse, uncompleteWorkoutInCourse, courses, scheduledWorkouts,
  } = useData();
  const workout = workouts.find(item => item.id === id);
  const occurrenceIdentity = [
    searchParams.get('scheduledWorkoutId'), searchParams.get('scheduledDate'),
    searchParams.get('courseId'), searchParams.get('courseItemId'),
  ].filter(Boolean).join(':');
  const activeRuntimeKey = runtimeKey(id, occurrenceIdentity);
  const steps = useMemo(() => workout ? buildWorkoutSteps(workout, exercises) : [], [workout, exercises]);
  const startedAt = useRef(Date.now());
  const activeElapsedMs = useRef(0);
  const activeSince = useRef<number | null>(Date.now());
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
  const [voiceEnabled, setVoiceEnabled] = useState(() => getAccessibilitySettings().voiceCues);
  const [musicEnabled, setMusicEnabled] = useState(() => getAccessibilitySettings().backgroundMusic);
  const musicVolume = useRef(getAccessibilitySettings().musicVolume).current;
  const lastSpokenCountdownRef = useRef<number | null>(null);
  // Guard against the per-step voice cue / vibration firing more than once
  // for the same step: `steps`/`exercises` get fresh array identities on an
  // unrelated background sync, which re-runs those effects even though
  // activeStep never moved. Reset only when activeStep genuinely changes.
  const announcedStepRef = useRef(false);
  const buzzedStepRef = useRef(false);
  const celebratedRef = useRef(false);

  // Personal bests and progression use workout history internally, without
  // reporting the date or details of the previous session during a workout.
  const personalRecords = useMemo(() => computePersonalRecords(sessions), [sessions]);
  const currentExerciseId = steps[activeStep]?.type === 'exercise' ? steps[activeStep]?.exerciseId : undefined;
  const currentExerciseHistory = useMemo(
    () => currentExerciseId ? exerciseSessionHistory(currentExerciseId, sessions) : [],
    [currentExerciseId, sessions],
  );

  // A step transition is announced by voice AND felt as a vibration, so
  // the workout stays followable even when speech synthesis is unreliable
  // (browser/OS-dependent — see the voice troubleshooting from earlier).
  // Capacitor's web implementation of Haptics.impact() uses the Vibration
  // API, which works on mobile browsers and the Android WebView but
  // rejects on desktop (no vibration hardware) — the catch is that, not an
  // error worth surfacing.
  const vibrate = useCallback((style: ImpactStyle) => {
    if (!getAccessibilitySettings().haptics) return;
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
      setAccessibilitySettings({ ...getAccessibilitySettings(), voiceCues: next });
      if (!next) void TextToSpeech.stop().catch(() => undefined);
      return next;
    });
  };

  const toggleMusic = () => {
    setMusicEnabled(prev => {
      const next = !prev;
      setAccessibilitySettings({ ...getAccessibilitySettings(), backgroundMusic: next });
      return next;
    });
  };

  // Backing track (the user's own file, or the generated ambient bed) plays
  // for the whole session, pausing only for the completion dialog.
  useWorkoutMusic(musicEnabled, restored && !completionOpen, musicVolume);

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
    const raw = localStorage.getItem(activeRuntimeKey);
    let saved: SavedRuntime | null = null;
    try { saved = raw ? JSON.parse(raw) as SavedRuntime : null; } catch { localStorage.removeItem(activeRuntimeKey); }
    if (saved?.workoutId === workout.id && saved.activeStep < steps.length) {
      startedAt.current = saved.startedAt;
      activeElapsedMs.current = saved.activeElapsedMs ?? 0;
      activeSince.current = saved.paused ? null : (saved.activeSince ?? saved.startedAt);
      setActiveStep(saved.activeStep);
      setPaused(saved.paused);
      const remaining = saved.deadline && !saved.paused
        ? remainingSeconds(saved.deadline) : saved.timeLeft;
      // A reps-based set is self-paced and never auto-advances, so resuming
      // one that had "elapsed" shouldn't skip it — leave the user on it to
      // press Next. An elapsed rest or timed exercise still rolls forward.
      const savedIsSelfPaced = isSelfPacedStep(steps[saved.activeStep]);
      const restoredStep = remaining === 0 && saved.deadline && !savedIsSelfPaced && saved.activeStep + 1 < steps.length
        ? saved.activeStep + 1 : saved.activeStep;
      const restoredDuration = isSelfPacedStep(steps[restoredStep]) ? 0
        : restoredStep === saved.activeStep ? remaining : (steps[restoredStep].duration || 0);
      setActiveStep(restoredStep);
      setTimeLeft(restoredDuration);
      setDeadline(saved.paused || restoredDuration <= 0 ? null : Date.now() + restoredDuration * 1000);
      if (remaining === 0 && saved.deadline && !savedIsSelfPaced && saved.activeStep + 1 >= steps.length) setCompletionOpen(true);
      if (saved.completionOpen) setCompletionOpen(true);
      toast({ title: 'Workout resumed', description: 'Continuing from your last saved step.' });
    } else {
      const duration = steps[0].duration || 0;
      setTimeLeft(duration);
      setDeadline(duration ? Date.now() + duration * 1000 : null);
    }
    const plannedResults = workout.sets.map((set, setIndex) => ({ exerciseId: set.exerciseId, setIndex,
      completed: true, reps: set.reps, weight: set.weight, duration: set.duration, distance: set.distance,
      direction: set.direction, warmup: set.warmup, amrap: set.amrap }));
    setActualSets(saved?.actualSets ?? plannedResults);
    setRpe(saved?.rpe ?? '');
    setCompletionNotes(saved?.completionNotes ?? '');
    setRestored(true);
  }, [workout, steps, restored, toast, activeRuntimeKey]);

  useEffect(() => {
    if (!workout || !restored) return;
    const value: SavedRuntime = {
      workoutId: workout.id, activeStep, startedAt: startedAt.current, timeLeft, deadline, paused,
      activeElapsedMs: activeElapsedMs.current, activeSince: activeSince.current,
      actualSets, rpe, completionNotes, completionOpen,
    };
    localStorage.setItem(activeRuntimeKey, JSON.stringify(value));
  }, [workout, restored, activeStep, timeLeft, deadline, paused, completionOpen, actualSets, rpe, completionNotes, activeRuntimeKey]);

  useEffect(() => {
    if (!restored) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [restored]);

  const startStep = useCallback((index: number) => {
    // stepClockSeconds is 0 for a self-paced (reps-based) exercise — no
    // deadline, no ticking, no auto-advance; the user presses Next.
    const duration = stepClockSeconds(steps[index]);
    setActiveStep(index); setTimeLeft(duration); setPaused(false);
    setDeadline(duration ? Date.now() + duration * 1000 : null);
  }, [steps]);

  useEffect(() => {
    advancing.current = false;
    lastSpokenCountdownRef.current = null;
    announcedStepRef.current = false;
    buzzedStepRef.current = false;
  }, [activeStep]);

  // Announces whenever a new step starts (including the very first, once
  // initial restore/setup has picked the right starting step) — "Get
  // ready" for the leading prep pause, "Rest" / "Rest, changing exercise"
  // for a rest, "Change side" for the unilateral switch, "Begin" for an
  // exercise. `announcedStepRef` keeps it to exactly one cue per step even
  // when this effect re-runs because `steps`/`exercises` changed identity.
  useEffect(() => {
    if (!restored || announcedStepRef.current) return;
    const step = steps[activeStep];
    // Deliberately terse (see stepStartAnnouncement) — not the exercise
    // name too; that's already the on-screen heading. An exercise step is
    // only announced once its exercise has actually loaded.
    if (!step) return;
    if (step.type === 'exercise' && !exercises.some(item => item.id === step.exerciseId)) return;
    announcedStepRef.current = true;
    const nextName = step.type === 'rest' && step.changesExercise
      ? exercises.find(item => item.id === steps[activeStep + 1]?.exerciseId)?.name
      : undefined;
    speak(stepStartAnnouncement(step, nextName));
  }, [activeStep, restored, steps, exercises, speak]);

  // A distinct buzz per step type, independent of voice readiness — this
  // is the fallback, so it shouldn't wait on anything voice-related.
  // `buzzedStepRef` keeps it to one buzz per step (see announcedStepRef).
  useEffect(() => {
    if (!restored || buzzedStepRef.current) return;
    const step = steps[activeStep];
    if (!step) return;
    buzzedStepRef.current = true;
    if (step.type === 'exercise') vibrate(ImpactStyle.Heavy);
    else if (step.type === 'rest') vibrate(step.kind === 'prep' ? ImpactStyle.Light : ImpactStyle.Medium);
  }, [activeStep, restored, steps, vibrate]);

  // A short celebratory chime the first time the completion dialog opens
  // (workout finished). Gated on the same voice toggle as spoken cues.
  useEffect(() => {
    if (!completionOpen) { celebratedRef.current = false; return; }
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    if (voiceEnabled) playCompletionChime();
  }, [completionOpen, voiceEnabled]);

  useEffect(() => () => { void TextToSpeech.stop().catch(() => undefined); }, []);
  // Reaching the end opens the completion dialog without changing
  // activeStep, so the effect above never fires to release this guard —
  // closing the dialog (without saving) and pressing Next again would
  // otherwise do nothing forever. Releasing it here covers that path too.
  useEffect(() => { if (!completionOpen) advancing.current = false; }, [completionOpen]);

  const stopActiveClock = useCallback(() => {
    if (activeSince.current === null) return;
    activeElapsedMs.current += Math.max(0, Date.now() - activeSince.current);
    activeSince.current = null;
  }, []);

  const nextStep = useCallback(() => {
    if (advancing.current) return;
    advancing.current = true;
    const next = activeStep + 1;
    if (next >= steps.length) {
      stopActiveClock();
      setDeadline(null); setPaused(true); setCompletionOpen(true); return;
    }
    startStep(next);
  }, [activeStep, steps.length, startStep, stopActiveClock]);

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
      // This effect only runs for steps that have a deadline — rests, the
      // prep/switch pauses, and genuinely timed exercises. Reps-based
      // exercises are self-paced and never get here (no deadline set).
      // Count down the last 5 seconds by voice; `remaining >= 1` skips the
      // terminal tick (at 0 the step is already over).
      if (step?.duration && remaining >= 1 && remaining <= 5) {
        if (lastSpokenCountdownRef.current !== remaining) {
          lastSpokenCountdownRef.current = remaining;
          speak(String(remaining));
        }
      }

      if (remaining === 0) nextStep();
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [paused, deadline, completionOpen, nextStep, steps, activeStep, speak]);

  const togglePause = () => {
    if (paused) {
      activeSince.current = Date.now();
      setPaused(false); setDeadline(timeLeft > 0 ? Date.now() + timeLeft * 1000 : null);
    }
    else {
      stopActiveClock();
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
    localStorage.removeItem(activeRuntimeKey);
    startedAt.current = Date.now();
    activeElapsedMs.current = 0;
    activeSince.current = Date.now();
    startStep(0);
    setRestartConfirmOpen(false);
  };

  // Backs out of the whole workout without saving a session — used by both
  // the completion dialog's "Don't save" button and closing that dialog via
  // its X (they're the same action, not "close the dialog but stay").
  const discardAndExit = () => {
    localStorage.removeItem(activeRuntimeKey);
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
      const course = courseId ? courses.find(item => item.id === courseId) : undefined;
      const nextSameDay = course && courseItemId
        ? getNextSameDayWorkout(course.workouts, courseItemId)
        : undefined;
      const activeDuration = activeElapsedMs.current
        + (activeSince.current === null ? 0 : Math.max(0, Date.now() - activeSince.current));
      const createdSession = await createSession({ workoutId: workout.id, completedAt, date: completedAt, title: workout.title,
        duration: Math.max(1, Math.round(activeDuration / 60000)), plannedDuration: workout.duration,
        category: workout.category, sets: workout.sets, restBetweenSets: workout.restBetweenSets,
        restBetweenExercises: workout.restBetweenExercises, notes: workout.notes, courseId, courseItemId,
        scheduledWorkoutId: searchParams.get('scheduledWorkoutId') || undefined, actualSets,
        scheduledDate: searchParams.get('scheduledDate') || undefined,
        perceivedExertion: rpe ? Number(rpe) : undefined, completionNotes: completionNotes.trim() || undefined });
      if (courseId && courseItemId) {
        try {
          const updatedCourse = await completeWorkoutInCourse(courseId, courseItemId);
          if (!updatedCourse) throw new Error('The linked course or workout slot no longer exists.');
        } catch (courseError) {
          // Do not leave a history row behind when the second half of the
          // completion fails; keeping the resumable state lets the user retry.
          try { await deleteSession(createdSession.id); }
          catch (rollbackError) {
            console.error('Could not roll back session after course update failed:', rollbackError);
            logDiagnostic('error', `Session rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
          }
          throw courseError;
        }
      }
      localStorage.removeItem(activeRuntimeKey);

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
        action: <ToastAction altText="Undo workout completion" onClick={() => void (async () => {
          await deleteSession(createdSession.id);
          if (courseId && courseItemId) await uncompleteWorkoutInCourse(courseId, courseItemId);
          toast({ title: 'Completion undone', description: 'The history record was removed.' });
        })()}>Undo</ToastAction>,
      });
      if (courseId && nextSameDay?.workoutId) {
        const nextSchedule = scheduledWorkouts.find(item => item.courseId === courseId && item.courseItemId === nextSameDay.id);
        const params = new URLSearchParams({ courseId, courseItemId: nextSameDay.id });
        if (nextSchedule) params.set('scheduledWorkoutId', nextSchedule.id);
        navigate(`/workouts/${nextSameDay.workoutId}/session?${params.toString()}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to save workout:', error);
      logDiagnostic('error', `Save workout failed: ${error instanceof Error ? error.message : String(error)}`);
      toast({ title: 'Could not save workout', description: 'Your resumable workout remains stored on this device.', variant: 'destructive' });
      setSaving(false);
    }
  };

  const current = steps[activeStep];
  const upcoming = steps[activeStep + 1];
  const exercise = current?.exerciseId ? exercises.find(item => item.id === current.exerciseId) : undefined;
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  // Self-paced steps have no live clock (timeLeft stays 0), so fall back to
  // their nominal duration for the "About X remaining" estimate. Rests and
  // timed exercises count down for real.
  const currentStepSeconds = isSelfPacedStep(current) ? (current?.duration || 0) : timeLeft;
  const remainingWorkoutSeconds = currentStepSeconds + steps.slice(activeStep + 1)
    .reduce((total, step) => total + (step.duration || 0), 0);
  // Warm-ups don't count toward "Set N of M" — number the working sets.
  const workoutSets = workout?.sets ?? [];
  const currentSourceIndex = current?.sourceSetIndex ?? steps[activeStep - 1]?.sourceSetIndex;
  const currentIsWarmup = currentSourceIndex !== undefined && !!workoutSets[currentSourceIndex]?.warmup;
  const workingSetCount = workoutSets.filter(item => !item.warmup).length;
  const workingSetNumber = currentSourceIndex === undefined ? 0
    : workoutSets.slice(0, currentSourceIndex + 1).filter(item => !item.warmup).length;
  const upcomingLabel = upcoming?.type === 'rest'
    ? (upcoming.kind === 'switch' ? 'Change side' : `Rest · ${formatTime(upcoming.duration || 0)}`)
    : upcoming?.exerciseId
      ? `${exercises.find(item => item.id === upcoming.exerciseId)?.name || 'Exercise'}${upcoming.direction ? ` · ${workoutDirectionLabel(upcoming.direction)}` : ''}`
      : 'Finish workout';
  const activeStepDuration = current?.duration || 0;
  const countdownPercent = activeStepDuration > 0
    ? Math.min(100, Math.max(0, ((activeStepDuration - timeLeft) / activeStepDuration) * 100))
    : 0;
  const upcomingExercise = upcoming?.exerciseId
    ? exercises.find(item => item.id === upcoming.exerciseId) : undefined;
  const currentBestLabel = bestRecordLabel(currentExerciseId ? personalRecords.get(currentExerciseId) : undefined);
  const progressionSuggestion = exercise && current?.type === 'exercise' && !current.warmup
    ? suggestNextSet(exercise, { reps: current.reps, weight: current.weight }, currentExerciseHistory)
    : null;
  const resultsValid = actualSets.every(result =>
    (result.reps === undefined || (result.reps >= 0 && result.reps <= 1000)) &&
    (result.weight === undefined || (result.weight >= 0 && result.weight <= 1000)) &&
    (result.duration === undefined || (result.duration >= 0 && result.duration <= 86400)) &&
    (result.distance === undefined || (result.distance >= 0 && result.distance <= 1000000)) &&
    (result.rpe === undefined || (result.rpe >= 0 && result.rpe <= 10))
  );
  if (!workout || !current) return null;

  return <div className="flex min-h-[100dvh] flex-col bg-[#070d18] text-white">
    <header className="flex items-center justify-between gap-2 px-2 py-2 pt-[max(.5rem,env(safe-area-inset-top))] sm:px-4 sm:py-3">
      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setExitConfirmOpen(true)} aria-label="Exit workout"><X className="h-5 w-5" /></Button>
      <h1 className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-white/85 sm:text-lg">{workout.title}</h1>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className={`hidden h-10 w-10 rounded-full text-white sm:inline-flex ${musicEnabled ? '' : 'opacity-40'}`} onClick={toggleMusic} aria-label={musicEnabled ? 'Turn off background music' : 'Turn on background music'} aria-pressed={musicEnabled}>
          <Music className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-white/80 hover:bg-white/10 hover:text-white" onClick={toggleVoice} aria-label={voiceEnabled ? 'Mute workout voice' : 'Unmute workout voice'}>
          {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setRestartConfirmOpen(true)} aria-label="Restart"><RotateCcw className="h-4 w-4" /></Button>
      </div>
    </header>
    <section className="space-y-2 px-4 pb-2" aria-label="Workout progress">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Step {activeStep + 1} of {steps.length}. {current.type === 'exercise' ? exercise?.name : restKindLabel(current)}.
      </p>
      <div className="flex justify-between text-xs text-slate-400 sm:text-sm">
        <span>{current.kind === 'prep' ? 'Getting started' : current.kind === 'switch' ? 'Change side' : currentIsWarmup ? 'Warm-up set' : `Set ${workingSetNumber} of ${workingSetCount}`}</span>
        <span>About {formatTime(remainingWorkoutSeconds)} remaining</span>
      </div>
      <Progress value={((activeStep + 1) / steps.length) * 100} className="h-1.5 bg-white/10 [&>div]:bg-workout-green" aria-label={`Step ${activeStep + 1} of ${steps.length}`} />
      {current.type === 'exercise' && <p className="hidden text-center text-sm text-slate-400 sm:block">Next: {upcomingLabel}</p>}
    </section>
    <main className="flex flex-1 flex-col items-center overflow-y-auto px-3 pb-28 pt-2 sm:justify-center sm:p-6 sm:pb-28">
      {current.type === 'exercise' && exercise ? <div key={activeStep} className="workout-step-enter flex w-full flex-col items-center">
        <div className="relative w-full max-w-lg">
          {getExerciseImageUrl(exercise, current.direction) ? (
            <ExerciseImage imageUrl={getExerciseImageUrl(exercise, current.direction)!} alt={`${exercise.name}${current.direction ? ` — ${workoutDirectionLabel(current.direction)}` : ''}`} className="h-[min(42dvh,23rem)] w-full rounded-3xl border border-white/10 bg-slate-50 object-contain p-2 shadow-[0_24px_70px_-30px_rgb(0_0_0/.9)] sm:h-[min(46vh,30rem)] sm:p-4" />
          ) : (
            <div className="flex h-[min(38dvh,20rem)] w-full items-center justify-center rounded-3xl border border-white/10 bg-white/[.04] text-white/25">
              <Dumbbell className="h-20 w-20" aria-hidden="true" />
            </div>
          )}
          {(exercise.videoUrl || exercise.instructions) && (
            <div className="absolute right-3 top-3 flex gap-2">
              {exercise.videoUrl && (
                <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-slate-950/75 text-white shadow-lg backdrop-blur transition hover:bg-slate-900"
                  aria-label={`Watch a video of ${exercise.name} (opens in a new tab)`}>
                  <Video className="h-4 w-4" />
                </a>
              )}
              {exercise.instructions && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-white/15 bg-slate-950/75 text-white shadow-lg backdrop-blur hover:bg-slate-900 hover:text-white"
                      aria-label={`How to perform ${exercise.name}`}>
                      <Info className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="max-w-[calc(100vw-2rem)] text-left">
                    <p className="mb-1 font-semibold">{exercise.name}</p>
                    <p className="instruction-copy text-sm text-muted-foreground">{exercise.instructions}</p>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>
        <div className="mt-4 text-center sm:mt-6">
          {(current.direction || current.warmup || current.amrap) && (
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
              {current.warmup && (
                <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-300">Warm-up</span>
              )}
              {current.amrap && (
                <span className="rounded-full bg-workout-green/15 px-3 py-1 text-xs font-semibold text-workout-green">AMRAP</span>
              )}
              {current.direction && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-workout-green/15 px-3 py-1 text-workout-green">
                  {current.direction === 'left' && <ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                  {current.direction === 'right' && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  {current.direction === 'forward' && <ArrowUp className="h-4 w-4" aria-hidden="true" />}
                  {current.direction === 'backward' && <ArrowDown className="h-4 w-4" aria-hidden="true" />}
                  <span className="text-sm font-semibold">{workoutDirectionLabel(current.direction)}</span>
                </span>
              )}
            </div>
          )}
          <h2 className="text-2xl font-semibold leading-tight sm:text-3xl" aria-live="polite">{exercise.name}</h2>
          {current.amrap && current.reps ? (
            <p className="metric-number mt-2 text-5xl font-black leading-none sm:text-6xl">{current.reps} reps</p>
          ) : current.reps ? (
            <p className="metric-number mt-2 text-5xl font-black leading-none sm:text-6xl">{current.reps} reps</p>
          ) : null}
          {current.amrap && current.reps && <p className="mt-1 text-sm text-slate-400">Beat the target</p>}
          {current.weight && <p className="metric-number mt-2 text-2xl font-bold text-workout-green sm:text-3xl">× {current.weight} kg</p>}
          {current.weight ? (
            <div className="mt-3 flex justify-center">
              <PlateCalculator initialWeight={current.weight}
                triggerClassName="h-9 rounded-full border-white/20 bg-white/[.04] text-white/80 hover:bg-white/10 hover:text-white" />
            </div>
          ) : null}
          {/* Timed exercises get the full countdown + progress bar and
              auto-advance. Reps-based exercises show only the rep target
              above — no clock, no bar, self-paced (press Next when done). */}
          {current.duration && !isSelfPacedStep(current) && <>
            <p className="my-3 text-6xl font-black leading-none sm:text-7xl" role="timer" aria-label={`${timeLeft} seconds remaining`}>{formatTime(timeLeft)}</p>
            <CountdownBar percent={countdownPercent} tone="bg-workout-green" />
          </>}
        </div>
        {(currentBestLabel || progressionSuggestion) && (
          <div className="mx-auto mt-4 flex w-full max-w-sm items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm landscape:hidden">
            {currentBestLabel && (
              <span className="text-slate-400">Best <strong className="metric-number ml-1 text-base text-white">{currentBestLabel}</strong></span>
            )}
            {progressionSuggestion && (
              <span className={`${currentBestLabel ? 'border-l border-white/10 pl-3' : ''} text-workout-green`}>Try <strong className="metric-number">{progressionSuggestion.reps}{progressionSuggestion.weight ? ` × ${progressionSuggestion.weight} kg` : ''}</strong><span className="sr-only">. {progressionSuggestion.note}</span></span>
            )}
          </div>
        )}
      </div> : <div key={activeStep} className="workout-step-enter flex w-full flex-1 flex-col items-center justify-center">
        <div className={`mb-3 flex items-center gap-2 rounded-full px-4 py-1.5 ${current.kind === 'switch' ? 'bg-workout-green/20 text-workout-green' : 'bg-workout-purple/20 text-workout-purple'}`}>
          {current.kind === 'switch' ? <ArrowLeftRight className="h-4 w-4" aria-hidden="true" /> : <Timer className="h-4 w-4" aria-hidden="true" />}
          <span className="text-sm font-semibold">{restKindLabel(current)}</span>
        </div>
        <div className="text-8xl font-black leading-none sm:text-9xl" role="timer" aria-label={`${timeLeft} seconds ${current.kind === 'prep' ? 'until start' : current.kind === 'switch' ? 'until the other side' : 'of rest remaining'}`}>{formatTime(timeLeft)}</div>
        <div className="mt-4 w-full"><CountdownBar percent={countdownPercent} tone="bg-workout-purple" /></div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="border-white/40 bg-transparent text-white" onClick={() => adjustRestTime(-15)} aria-label="Subtract 15 seconds">
            <Minus className="mr-1 h-4 w-4" />15s
          </Button>
          <Button variant="outline" className="border-white/40 bg-transparent text-white" onClick={() => adjustRestTime(15)} aria-label="Add 15 seconds">
            <Plus className="mr-1 h-4 w-4" />15s
          </Button>
        </div>
        {upcoming && (
          <div className="mt-8 w-full max-w-sm rounded-3xl border border-white/10 bg-white/[.04] p-3 text-center">
            <p className="mb-2 text-sm font-medium text-workout-green">Next up</p>
            {upcomingExercise && getExerciseImageUrl(upcomingExercise, upcoming.type === 'exercise' ? upcoming.direction : undefined) && (
              <ExerciseImage imageUrl={getExerciseImageUrl(upcomingExercise, upcoming.type === 'exercise' ? upcoming.direction : undefined)!} alt={upcomingExercise.name}
                className="mx-auto mb-3 h-44 w-full rounded-2xl bg-slate-50 object-contain p-2" />
            )}
            <p className="text-2xl font-semibold">{upcomingLabel}</p>
            {upcoming.type === 'exercise' && (upcoming.reps || upcoming.duration) && (
              <p className="mt-1 text-sm text-gray-400">
                {upcoming.reps ? `${upcoming.reps} reps` : formatTime(upcoming.duration || 0)}
                {upcoming.weight ? ` · ${upcoming.weight} kg` : ''}
              </p>
            )}
          </div>
        )}
      </div>}
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-[3.5rem_3.5rem_minmax(0,1fr)] gap-2 border-t border-white/10 bg-[#070d18]/90 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-[0_-16px_40px_-28px_rgb(0_0_0/.9)] backdrop-blur-xl sm:grid-cols-3" aria-label="Workout controls">
      <Button size="lg" variant="outline" className="h-14 min-w-0 rounded-2xl border-white/20 bg-white/[.03] px-0 text-white hover:bg-white/10 hover:text-white sm:px-2" onClick={previousStep} disabled={activeStep === 0} aria-label="Previous"><ChevronLeft className="h-5 w-5 sm:mr-1" /><span className="hidden sm:inline">Previous</span></Button>
      <Button size="lg" className="h-14 min-w-0 rounded-2xl bg-workout-purple px-0 text-white hover:bg-workout-purple/90 sm:px-2" onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>{paused ? <Play className="h-5 w-5 sm:mr-1" /> : <Pause className="h-5 w-5 sm:mr-1" />}<span className="hidden sm:inline">{paused ? 'Resume' : 'Pause'}</span></Button>
      <Button size="lg" className="h-14 min-w-0 rounded-2xl bg-workout-green px-4 text-base font-bold text-white shadow-lg shadow-emerald-950/30 hover:bg-green-600 sm:px-2" onClick={nextStep}>{activeStep === steps.length - 1 ? 'Finish' : current.kind === 'prep' ? "I'm ready" : current.kind === 'switch' ? 'Skip' : current.type === 'rest' ? 'Skip rest' : 'Next'}<SkipForward className="ml-2 h-5 w-5" /></Button>
    </nav>
    <Dialog open={completionOpen} onOpenChange={(open) => { if (!open) setExitConfirmOpen(true); }}><DialogContent className="h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg"><DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="completion-check h-6 w-6 text-workout-green" aria-hidden="true" />Complete workout</DialogTitle><DialogDescription>Confirm what you completed. Adjust results or mark skipped sets before saving.</DialogDescription></DialogHeader>
      <div className="space-y-3">{actualSets.map((result, index) => {
        const planned = workout.sets[index];
        const name = exercises.find(item => item.id === result.exerciseId)?.name || 'Exercise';
        const tag = `${result.direction && result.direction !== 'none' ? ` · ${workoutDirectionLabel(result.direction)}` : ''}${result.warmup ? ' · Warm-up' : result.amrap ? ' · AMRAP' : ''}`;
        return <div key={index} className={`border rounded-md p-3 ${result.warmup ? 'border-amber-400/40' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Checkbox id={`completed-${index}`} checked={result.completed} onCheckedChange={checked => updateResult(index, { completed: checked === true })} />
            <Label htmlFor={`completed-${index}`} className="font-medium flex-1">{name} · Set {result.setIndex + 1}{tag}</Label>
            <span className="text-xs text-muted-foreground">{result.completed ? 'Completed' : 'Skipped'}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {planned.reps !== undefined && <div><Label htmlFor={`result-reps-${index}`}>{result.amrap ? 'Reps done' : 'Reps'}</Label><Input id={`result-reps-${index}`} type="number" min="0" max="1000" value={result.reps ?? ''} onChange={e => updateResult(index, { reps: Number(e.target.value) })} /></div>}
            {planned.weight !== undefined && <div><Label htmlFor={`result-weight-${index}`}>Weight (kg)</Label><Input id={`result-weight-${index}`} type="number" min="0" max="1000" step="0.5" value={result.weight ?? ''} onChange={e => updateResult(index, { weight: Number(e.target.value) })} /></div>}
            {planned.duration !== undefined && <div><Label htmlFor={`result-duration-${index}`}>Seconds</Label><Input id={`result-duration-${index}`} type="number" min="0" max="86400" value={result.duration ?? ''} onChange={e => updateResult(index, { duration: Number(e.target.value) })} /></div>}
            {planned.distance !== undefined && <div><Label htmlFor={`result-distance-${index}`}>Distance (m)</Label><Input id={`result-distance-${index}`} type="number" min="0" max="1000000" value={result.distance ?? ''} onChange={e => updateResult(index, { distance: Number(e.target.value) })} /></div>}
            {!result.warmup && <div><Label htmlFor={`result-rpe-${index}`}>RPE (1–10)</Label><Input id={`result-rpe-${index}`} type="number" min="1" max="10" step="0.5" value={result.rpe ?? ''} onChange={e => updateResult(index, { rpe: e.target.value ? Number(e.target.value) : undefined })} /></div>}
          </div>
        </div>;
      })}</div>
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
