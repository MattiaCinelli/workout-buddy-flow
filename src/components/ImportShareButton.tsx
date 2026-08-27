import { useRef, useState, type ChangeEvent } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { importShare, parseShare, summarizeShareImport, WorkoutBuddyShare } from '@/lib/backup';

interface ImportShareButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm';
  className?: string;
  label?: string;
}

// Pick a shared-exercise / shared-workout JSON file (see lib/backup.ts) and
// merge it into the local library. Non-destructive: it only ever adds.
const ImportShareButton = ({ variant = 'outline', size = 'default', className, label = 'Import' }: ImportShareButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { exercises, muscleGroups, createExercise, createWorkout, createMuscleGroup } = useData();
  const { toast } = useToast();
  const [pending, setPending] = useState<WorkoutBuddyShare | null>(null);
  const [pendingWarnings, setPendingWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const summary = pending ? summarizeShareImport(pending, exercises, muscleGroups) : null;
  const primaryName = pending?.kind === 'workout'
    ? pending.data.workouts[0]?.title
    : pending?.data.exercises[0]?.name;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const { data, warnings } = parseShare(await file.text());
      setPending(data);
      setPendingWarnings(warnings);
    } catch (error) {
      toast({
        title: 'Could not read that file',
        description: error instanceof Error ? error.message : 'Unsupported file.',
        variant: 'destructive',
      });
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    setImporting(true);
    try {
      const result = await importShare(pending, { exercises, muscleGroups, createExercise, createWorkout, createMuscleGroup });
      const added: string[] = [];
      if (result.workouts) added.push(`${result.workouts} workout${result.workouts === 1 ? '' : 's'}`);
      if (result.newExercises) added.push(`${result.newExercises} new exercise${result.newExercises === 1 ? '' : 's'}`);
      if (result.newMuscleGroups) added.push(`${result.newMuscleGroups} muscle group${result.newMuscleGroups === 1 ? '' : 's'}`);
      toast({
        title: 'Import complete',
        description: added.length ? `Added ${added.join(', ')}.` : 'Everything was already in your library.',
      });
      setPending(null);
      setPendingWarnings([]);
    } catch (error) {
      console.error('Share import failed:', error);
      toast({ title: 'Import failed', description: 'Nothing was changed.', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4 mr-2" />
        {label}
      </Button>
      <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />

      <AlertDialog open={!!pending} onOpenChange={open => { if (!open && !importing) { setPending(null); setPendingWarnings([]); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Import {pending?.kind === 'workout' ? 'workout' : 'exercise'}{primaryName ? ` “${primaryName}”` : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This adds to your library without changing anything already there.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {summary && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
              {summary.workouts > 0 && <li>{summary.workouts} workout{summary.workouts === 1 ? '' : 's'} added as a copy</li>}
              {summary.newExercises > 0 && <li>{summary.newExercises} new exercise{summary.newExercises === 1 ? '' : 's'}</li>}
              {summary.reusedExercises > 0 && (
                <li>{summary.reusedExercises} exercise{summary.reusedExercises === 1 ? '' : 's'} already in your library (reused by name)</li>
              )}
              {summary.newMuscleGroups > 0 && <li>{summary.newMuscleGroups} new muscle group{summary.newMuscleGroups === 1 ? '' : 's'}</li>}
            </ul>
          )}
          {pendingWarnings.length > 0 && (
            <ul className="list-disc space-y-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 pl-6 text-xs text-amber-700 dark:text-amber-300">
              {pendingWarnings.map((warning, index) => <li key={index}>{warning}</li>)}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={event => { event.preventDefault(); void confirmImport(); }} disabled={importing}>
              {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</> : 'Import'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ImportShareButton;
