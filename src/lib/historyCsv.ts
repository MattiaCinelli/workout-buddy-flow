import { WorkoutSession, WorkoutSetResult } from '@/data/workoutSessions';
import { Exercise } from '@/data/exercises';

const HEADERS = [
  'date', 'workout', 'category', 'duration_min', 'perceived_exertion',
  'exercise', 'set', 'completed', 'reps', 'weight_kg', 'duration_s', 'distance_m',
] as const;

const cell = (value: string | number | undefined | null): string => {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const setsOf = (session: WorkoutSession): WorkoutSetResult[] =>
  session.actualSets ?? session.sets.map((set, setIndex) => ({ ...set, setIndex, completed: true }));

// One row per logged set (the finest grain the data has), oldest session
// first — a shape a spreadsheet or notebook can pivot on.
export const sessionsToCsv = (sessions: WorkoutSession[], exercises: Exercise[]): string => {
  const exerciseName = (id: string) => exercises.find(item => item.id === id)?.name ?? id;
  const ordered = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const rows: string[] = [HEADERS.join(',')];

  for (const session of ordered) {
    const date = session.date.slice(0, 10);
    for (const set of setsOf(session)) {
      rows.push([
        date, session.title, session.category, session.duration, session.perceivedExertion ?? '',
        exerciseName(set.exerciseId), set.setIndex + 1, set.completed ? 'yes' : 'no',
        set.reps ?? '', set.weight ?? '', set.duration ?? '', set.distance ?? '',
      ].map(cell).join(','));
    }
  }

  return rows.join('\n');
};
