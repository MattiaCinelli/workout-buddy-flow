import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, TrendingUp } from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { computePersonalRecords } from '@/lib/personalRecords';
import {
  describeSetResult, exerciseSessionHistory, exerciseSessionSummaries, formatLoggedDistance, formatLoggedDuration,
} from '@/lib/exerciseHistory';
import { describeSeries } from '@/lib/chartA11y';
import { suggestNextSet } from '@/lib/progression';

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

interface ChartPoint { label: string; value: number | undefined; }

const TrendChart = ({ title, description, data, unit, color }: {
  title: string; description: string; data: ChartPoint[]; unit: string; color: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="h-[240px]" role="img" aria-label={describeSeries(title, data.map(point => point.value), unit)}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart accessibilityLayer data={data} margin={{ top: 4, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" className="text-xs" />
            <YAxis className="text-xs" width={44} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} ${unit}`, title]} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ fill: color, r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </CardContent>
  </Card>
);

const ExerciseProgress = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { exercises, sessions, exercisesLoading, sessionsLoading } = useData();

  const exercise = exercises.find(item => item.id === id);
  const history = useMemo(() => exerciseSessionHistory(id, sessions), [id, sessions]);
  const summaries = useMemo(() => exerciseSessionSummaries(id, sessions), [id, sessions]);
  const record = useMemo(() => computePersonalRecords(sessions).get(id), [sessions, id]);
  const suggestion = exercise
    ? suggestNextSet(exercise, { reps: exercise.defaultReps, weight: exercise.defaultWeight }, history)
    : null;

  if (exercisesLoading || sessionsLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Exercise not found</h2>
            <Button onClick={() => navigate('/exercises')}>Back to Exercises</Button>
          </div>
        </div>
      </div>
    );
  }

  const points = (pick: (s: typeof summaries[number]) => number | undefined): ChartPoint[] =>
    summaries.map(summary => ({ label: format(parseISO(summary.date), 'MMM d'), value: pick(summary) }));

  const hasWeight = summaries.some(s => s.topWeight !== undefined);
  const hasVolume = summaries.some(s => s.totalVolume !== undefined);
  const hasDuration = summaries.some(s => s.bestDuration !== undefined);
  const hasDistance = summaries.some(s => s.bestDistance !== undefined);
  const hasRepsOnly = !hasWeight && summaries.some(s => s.totalReps !== undefined);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto max-w-3xl py-6 px-4 md:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {exercise.imageUrl && (
            <img src={exercise.imageUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="truncate text-2xl font-bold">{exercise.name}</h1>
            <p className="text-sm text-muted-foreground">Progress from your completed sessions</p>
          </div>
        </div>

        {suggestion && (
          <Card className="mb-6 border-workout-green/40 bg-workout-green/5">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-workout-green">Next target</p>
              <p className="text-lg font-bold">
                {suggestion.reps}{suggestion.weight ? ` × ${suggestion.weight} kg` : ''}
              </p>
              <p className="text-sm text-muted-foreground">{suggestion.note}</p>
            </CardContent>
          </Card>
        )}

        {history.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No completed sessions include this exercise yet. Finish a workout with it to start tracking progress.
              </p>
              <Button variant="outline" onClick={() => navigate('/workouts')}>Go to workouts</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Times performed" value={String(history.length)} />
              <StatCard label="Last performed" value={formatDistanceToNow(parseISO(history[0].date), { addSuffix: true })} />
              {record?.maxWeight && (
                <StatCard label="Best weight" value={`${record.maxWeight.value} kg`}
                  sub={format(parseISO(record.maxWeight.date), 'MMM d, yyyy')} />
              )}
              {record?.maxReps && (
                <StatCard label="Best reps (set)" value={`${record.maxReps.value}`}
                  sub={format(parseISO(record.maxReps.date), 'MMM d, yyyy')} />
              )}
              {record?.maxDuration && (
                <StatCard label="Best hold" value={formatLoggedDuration(record.maxDuration.value)}
                  sub={format(parseISO(record.maxDuration.date), 'MMM d, yyyy')} />
              )}
              {record?.maxDistance && (
                <StatCard label="Best distance" value={formatLoggedDistance(record.maxDistance.value)}
                  sub={format(parseISO(record.maxDistance.date), 'MMM d, yyyy')} />
              )}
            </div>

            {hasWeight && (
              <TrendChart title="Top set weight" description="Heaviest completed set each session"
                data={points(s => s.topWeight)} unit="kg" color="hsl(var(--primary))" />
            )}
            {hasVolume && (
              <TrendChart title="Session volume" description="Sum of weight × reps across sets"
                data={points(s => s.totalVolume)} unit="kg" color="hsl(var(--accent))" />
            )}
            {hasRepsOnly && (
              <TrendChart title="Total reps" description="Reps completed each session"
                data={points(s => s.totalReps)} unit="reps" color="hsl(var(--primary))" />
            )}
            {hasDuration && (
              <TrendChart title="Best hold" description="Longest completed set each session"
                data={points(s => s.bestDuration)} unit="sec" color="hsl(var(--primary))" />
            )}
            {hasDistance && (
              <TrendChart title="Best distance" description="Farthest completed set each session"
                data={points(s => s.bestDistance)} unit="m" color="hsl(var(--accent))" />
            )}

            <div>
              <h2 className="mb-3 text-lg font-semibold">Session history</h2>
              <ul className="space-y-2">
                {history.map(entry => (
                  <li key={entry.sessionId} className="rounded-md border p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{entry.workoutTitle}</span>
                      <span className="text-xs text-muted-foreground">{format(parseISO(entry.date), 'EEE, MMM d, yyyy')}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.sets.map((set, index) => (
                        <span key={index}>
                          {index > 0 && <span className="mx-1.5 text-border">·</span>}
                          {describeSetResult(set)}
                        </span>
                      ))}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ExerciseProgress;
