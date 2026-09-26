import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useData } from '@/contexts/useData';
import { computePersonalRecords, PRKind } from '@/lib/personalRecords';

const PR_UNIT: Record<PRKind, string> = { weight: 'kg', reps: 'reps', duration: 'sec', distance: 'm' };
const PR_LABEL: Record<PRKind, string> = { weight: 'Weight', reps: 'Reps', duration: 'Time', distance: 'Distance' };

type RecordKey = 'maxWeight' | 'maxReps' | 'maxDuration' | 'maxDistance';
const recordKey = (kind: PRKind) => `max${kind[0].toUpperCase()}${kind.slice(1)}` as RecordKey;

// The automatic, computed-from-workouts list. It sits below the user's own
// "My Records" and starts collapsed, since it is a long reference list rather
// than something to read on every visit.
export function PersonalRecordsCard() {
  const { sessions, exercises } = useData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const records = computePersonalRecords(sessions, exercises);
    return [...records.values()]
      .map(record => ({ record, exercise: exercises.find(item => item.id === record.exerciseId) }))
      .filter(row => row.exercise)
      .sort((a, b) => (a.exercise!.name).localeCompare(b.exercise!.name));
  }, [sessions, exercises]);

  const kindsFor = (record: typeof rows[number]['record']): PRKind[] =>
    (['weight', 'reps', 'duration', 'distance'] as PRKind[]).filter(kind => record[recordKey(kind)] !== undefined);

  return (
    <Card>
      <CardHeader className="p-0">
        <button
          type="button"
          onClick={() => setOpen(current => !current)}
          aria-expanded={open}
          className="flex w-full items-start justify-between gap-3 rounded-lg p-6 text-left"
        >
          <span className="space-y-1.5">
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" />Exercise Records</CardTitle>
            <CardDescription>
              Your best weight, reps, time, and distance per exercise, worked out automatically from completed workouts.
            </CardDescription>
          </span>
          <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </CardHeader>
      {open && (
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Complete some workouts to start setting personal records.
            </p>
          ) : (
            <ul className="space-y-3 max-h-96 overflow-y-auto">
              {rows.map(({ record, exercise }) => (
                <li key={record.exerciseId}>
                  <button
                    type="button"
                    onClick={() => navigate(`/exercises/${record.exerciseId}/progress`)}
                    className="flex w-full items-start gap-2 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{exercise!.name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {kindsFor(record).map(kind => {
                          const entry = record[recordKey(kind)]!;
                          return (
                            <span key={kind}>
                              {PR_LABEL[kind]}: <span className="metric-number text-base font-bold text-foreground">{entry.value} {PR_UNIT[kind]}</span>
                              {' '}<span className="text-xs">({format(parseISO(entry.date), 'MMM d, yyyy')})</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  );
}
