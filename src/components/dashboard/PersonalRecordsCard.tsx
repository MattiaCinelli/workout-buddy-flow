import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useData } from '@/contexts/DataContext';
import { computePersonalRecords, PRKind } from '@/lib/personalRecords';

const PR_UNIT: Record<PRKind, string> = { weight: 'kg', reps: 'reps', duration: 'sec', distance: 'm' };
const PR_LABEL: Record<PRKind, string> = { weight: 'Weight', reps: 'Reps', duration: 'Time', distance: 'Distance' };

export function PersonalRecordsCard() {
  const { sessions, exercises } = useData();

  const rows = useMemo(() => {
    const records = computePersonalRecords(sessions);
    return [...records.values()]
      .map(record => ({ record, exercise: exercises.find(item => item.id === record.exerciseId) }))
      .filter(row => row.exercise)
      .sort((a, b) => (a.exercise!.name).localeCompare(b.exercise!.name));
  }, [sessions, exercises]);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" />Personal Records</CardTitle>
          <CardDescription>Your best-ever weight, reps, time, and distance per exercise.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Complete some workouts to start setting personal records.
          </p>
        </CardContent>
      </Card>
    );
  }

  const kindsFor = (record: typeof rows[number]['record']): PRKind[] =>
    (['weight', 'reps', 'duration', 'distance'] as PRKind[]).filter(kind => {
      const key = `max${kind[0].toUpperCase()}${kind.slice(1)}` as 'maxWeight' | 'maxReps' | 'maxDuration' | 'maxDistance';
      return record[key] !== undefined;
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" />Personal Records</CardTitle>
        <CardDescription>Your best-ever weight, reps, time, and distance per exercise.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 max-h-96 overflow-y-auto">
          {rows.map(({ record, exercise }) => (
            <li key={record.exerciseId} className="rounded-md border p-3">
              <p className="font-medium">{exercise!.name}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {kindsFor(record).map(kind => {
                  const key = `max${kind[0].toUpperCase()}${kind.slice(1)}` as 'maxWeight' | 'maxReps' | 'maxDuration' | 'maxDistance';
                  const entry = record[key]!;
                  return (
                    <span key={kind}>
                      {PR_LABEL[kind]}: <span className="font-medium text-foreground">{entry.value} {PR_UNIT[kind]}</span>
                      {' '}<span className="text-xs">({format(parseISO(entry.date), 'MMM d, yyyy')})</span>
                    </span>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
