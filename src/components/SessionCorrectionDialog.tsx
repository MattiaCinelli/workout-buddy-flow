import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { WorkoutSession, WorkoutSetResult } from '@/data/workoutSessions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface SessionCorrectionDialogProps {
  session: WorkoutSession | null;
  onClose: () => void;
  onSave: (updates: Partial<WorkoutSession>) => Promise<void>;
}

const toLocalDateTime = (iso: string) => {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export function SessionCorrectionDialog({ session, onClose, onSave }: SessionCorrectionDialogProps) {
  const [completedAt, setCompletedAt] = useState('');
  const [duration, setDuration] = useState('');
  const [rpe, setRpe] = useState('');
  const [notes, setNotes] = useState('');
  const [results, setResults] = useState<WorkoutSetResult[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    setCompletedAt(toLocalDateTime(session.completedAt));
    setDuration(String(session.duration));
    setRpe(session.perceivedExertion ? String(session.perceivedExertion) : '');
    setNotes(session.completionNotes ?? '');
    setResults(session.actualSets ? session.actualSets.map(result => ({ ...result })) : []);
  }, [session]);

  const updateResult = (index: number, updates: Partial<WorkoutSetResult>) =>
    setResults(current => current.map((result, resultIndex) => resultIndex === index ? { ...result, ...updates } : result));

  const numericValuesValid = results.every(result =>
    (result.reps === undefined || (result.reps >= 0 && result.reps <= 1000))
    && (result.weight === undefined || (result.weight >= 0 && result.weight <= 1000))
    && (result.duration === undefined || (result.duration >= 0 && result.duration <= 86400))
    && (result.distance === undefined || (result.distance >= 0 && result.distance <= 1_000_000))
  );
  const formValid = !!completedAt && Number(duration) >= 1
    && (!rpe || (Number(rpe) >= 1 && Number(rpe) <= 10)) && numericValuesValid;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formValid) return;
    setSaving(true);
    try {
      const correctedAt = new Date(completedAt).toISOString();
      await onSave({
        completedAt: correctedAt,
        date: correctedAt,
        duration: Number(duration),
        perceivedExertion: rpe ? Number(rpe) : undefined,
        completionNotes: notes.trim() || undefined,
        actualSets: results.length ? results : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!session} onOpenChange={open => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Correct workout record</DialogTitle>
          <DialogDescription>Fix when the session happened and what you actually completed.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="correction-completed-at">Completed</Label>
              <Input id="correction-completed-at" type="datetime-local" value={completedAt}
                onChange={event => setCompletedAt(event.target.value)} disabled={saving} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="correction-duration">Duration (minutes)</Label>
              <Input id="correction-duration" type="number" min="1" max="1440" value={duration}
                onChange={event => setDuration(event.target.value)} disabled={saving} />
            </div>
          </div>

          {results.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="font-medium">Set results</legend>
              {results.map((result, index) => (
                <div key={`${result.exerciseId}-${result.setIndex}`} className="rounded-lg border p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <Checkbox id={`correction-set-${index}`} checked={result.completed}
                      onCheckedChange={checked => updateResult(index, { completed: checked === true })} />
                    <Label htmlFor={`correction-set-${index}`}>Set {result.setIndex + 1}</Label>
                    <span className="ml-auto text-xs text-muted-foreground">{result.completed ? 'Completed' : 'Skipped'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {result.reps !== undefined && <div><Label htmlFor={`correction-reps-${index}`}>Reps</Label><Input id={`correction-reps-${index}`} type="number" min="0" max="1000" value={result.reps} onChange={event => updateResult(index, { reps: Number(event.target.value) })} /></div>}
                    {result.weight !== undefined && <div><Label htmlFor={`correction-weight-${index}`}>Weight (kg)</Label><Input id={`correction-weight-${index}`} type="number" min="0" max="1000" step="0.5" value={result.weight} onChange={event => updateResult(index, { weight: Number(event.target.value) })} /></div>}
                    {result.duration !== undefined && <div><Label htmlFor={`correction-seconds-${index}`}>Seconds</Label><Input id={`correction-seconds-${index}`} type="number" min="0" max="86400" value={result.duration} onChange={event => updateResult(index, { duration: Number(event.target.value) })} /></div>}
                    {result.distance !== undefined && <div><Label htmlFor={`correction-distance-${index}`}>Distance (m)</Label><Input id={`correction-distance-${index}`} type="number" min="0" max="1000000" value={result.distance} onChange={event => updateResult(index, { distance: Number(event.target.value) })} /></div>}
                  </div>
                </div>
              ))}
            </fieldset>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="correction-rpe">Perceived exertion (1–10)</Label>
            <Input id="correction-rpe" type="number" min="1" max="10" value={rpe} onChange={event => setRpe(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="correction-notes">Session notes</Label>
            <Textarea id="correction-notes" value={notes} onChange={event => setNotes(event.target.value)} />
          </div>
          {!formValid && <p role="alert" className="text-sm text-destructive">Check the date, duration, exertion, and set values.</p>}
          <DialogFooter className="sticky bottom-0 bg-background py-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !formValid}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save corrections
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
