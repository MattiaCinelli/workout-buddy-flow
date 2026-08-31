/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';

// --- mock the whole environment the page pulls in -------------------------

const { speak, ttsStop, workouts, exercises } = vi.hoisted(() => ({
  speak: vi.fn(async (_opts: { text: string }) => {}),
  ttsStop: vi.fn(async () => {}),
  workouts: [] as Record<string, unknown>[],
  exercises: [] as Record<string, unknown>[],
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'w1' }),
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));
vi.mock('@capacitor-community/text-to-speech', () => ({
  TextToSpeech: { speak: (opts: { text: string }) => speak(opts), stop: () => ttsStop() },
}));
vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: async () => {} },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useWorkoutMusic', () => ({ useWorkoutMusic: vi.fn() }));
vi.mock('@/lib/diagnosticLog', () => ({ logDiagnostic: vi.fn() }));
vi.mock('@/lib/accessibilitySettings', () => ({
  getAccessibilitySettings: () => ({
    voiceCues: true, haptics: false, backgroundMusic: false, musicVolume: 0.5,
    textSize: 'standard', motion: 'system',
  }),
  setAccessibilitySettings: vi.fn(),
}));
vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({
    workouts, exercises, sessions: [], workoutsLoading: false,
    createSession: vi.fn(async () => ({ id: 's1' })), deleteSession: vi.fn(),
    completeWorkoutInCourse: vi.fn(), uncompleteWorkoutInCourse: vi.fn(),
  }),
}));

import WorkoutPresentation from './WorkoutPresentation';

type Set = { exerciseId: string; reps?: number; duration?: number };
const setWorkout = (sets: Set[]) => {
  workouts.length = 0;
  workouts.push({ id: 'w1', title: 'Test Workout', category: 'strength', duration: 10, date: '2026-01-01', sets });
};
const setExercises = (list: Record<string, unknown>[]) => { exercises.length = 0; exercises.push(...list); };
const ex = (over: Record<string, unknown>) => ({
  id: 'x', name: 'Exercise', category: 'strength', muscleGroups: [], difficulty: 'beginner', ...over,
});

const spoke = (text: string) =>
  speak.mock.calls.some(([opts]) => (opts as { text?: string })?.text === text);
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

// Mount, then run out the 10-second "get ready" prep so we land on step 1.
const startAndSkipPrep = async () => {
  render(<WorkoutPresentation />);
  await act(async () => { await Promise.resolve(); });
  expect(spoke('Get ready')).toBe(true);
  speak.mockClear();
  await advance(10_000);
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  speak.mockClear();
  ttsStop.mockClear();
});
afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('WorkoutPresentation — guided run', () => {
  it('a reps exercise: says "Begin", shows the rep target, no timer, and does not auto-advance', async () => {
    setExercises([ex({ id: 'pushup', name: 'Push-up', logType: 'reps', secondsPerRep: 3 })]);
    setWorkout([{ exerciseId: 'pushup', reps: 10 }, { exerciseId: 'pushup', reps: 10 }]);

    await startAndSkipPrep();

    expect(spoke('Begin')).toBe(true);
    expect(screen.getByText(/10 reps/)).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();

    speak.mockClear();
    await advance(60_000);
    expect(screen.getByText(/10 reps/)).toBeInTheDocument(); // stayed put
    expect(spoke('Rest')).toBe(false);
  });

  it('a unilateral reps exercise announces the side', async () => {
    setExercises([ex({ id: 'row', name: 'Single-arm Row', logType: 'reps', secondsPerRep: 3, unilateral: true })]);
    setWorkout([{ exerciseId: 'row', reps: 8 }]);

    await startAndSkipPrep();

    expect(spoke('Begin left side')).toBe(true);
  });

  it('a timed exercise: shows a live countdown and auto-advances to the rest', async () => {
    setExercises([ex({ id: 'plank', name: 'Plank', logType: 'time' })]);
    setWorkout([{ exerciseId: 'plank', duration: 8 }, { exerciseId: 'plank', duration: 8 }]);

    await startAndSkipPrep();

    expect(spoke('Begin')).toBe(true);
    expect(screen.getByRole('timer')).toBeInTheDocument();

    speak.mockClear();
    await advance(9_000);
    expect(spoke('Rest')).toBe(true); // auto-advanced into the between-sets rest
  });
});
