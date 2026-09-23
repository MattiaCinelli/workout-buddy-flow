import { ReactNode, useState } from 'react';
import { AlertTriangle, Download, Loader2, RotateCcw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/useData';
import { Button } from '@/components/ui/button';
import { formatDiagnostics } from '@/lib/diagnosticLog';
import { saveTextFile } from '@/lib/downloadFile';

export function DataRecoveryGate({ children }: { children: ReactNode }) {
  const data = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [retrying, setRetrying] = useState(false);
  const errors = [data.exercisesError, data.workoutsError, data.sessionsError,
    data.scheduledWorkoutsError, data.coursesError, data.muscleGroupsError, data.bodyMetricsError, data.measurementsError]
    .filter((error): error is string => !!error);
  if (!errors.length || location.pathname === '/settings') return <>{children}</>;

  const retry = async () => {
    setRetrying(true);
    await Promise.allSettled([data.refreshExercises(), data.refreshWorkouts(), data.refreshSessions(),
      data.refreshScheduledWorkouts(), data.refreshCourses(), data.refreshMuscleGroups(), data.refreshBodyMetrics(), data.refreshMeasurements()]);
    setRetrying(false);
  };

  return <main className="flex min-h-[100dvh] items-center justify-center bg-background p-5">
    <div className="w-full max-w-lg space-y-4 rounded-2xl border bg-card p-6 shadow-xl">
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <div><h1 className="text-xl font-bold">Your local data did not load completely</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nothing has been replaced. Retry the database, inspect diagnostics, or restore a known-good backup.</p></div>
      <ul className="list-disc pl-5 text-sm text-muted-foreground">{[...new Set(errors)].map(error => <li key={error}>{error}</li>)}</ul>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button onClick={() => void retry()} disabled={retrying}>{retrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}Retry</Button>
        <Button variant="outline" onClick={() => void saveTextFile(formatDiagnostics(), `workout-buddy-diagnostics-${new Date().toISOString().slice(0, 10)}.txt`, 'text/plain')}><Download className="mr-2 h-4 w-4" />Diagnostics</Button>
        <Button variant="outline" onClick={() => navigate('/settings#data')}>Restore backup</Button>
      </div>
    </div>
  </main>;
}
