import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronRight, Plus, Ruler, Trash2, Trophy } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/useData';
import type { MeasurementBetter, MeasurementKind } from '@/data/measurements';
import { describeSeries } from '@/lib/chartA11y';
import {
  defaultBetter, formatMeasurementValue, groupMeasurements, KIND_INPUT_HINT, KIND_LABEL,
  parseMeasurementInput, type MeasurementGroup,
} from '@/lib/measurements';

const todayStr = () => new Date().toISOString().split('T')[0];
const NAME_MAX = 100;
const TEXT_MAX = 2000;
// Readable in both themes: the theme's own green and red are ~2.6:1 and ~3.8:1
// on white, below the WCAG AA 4.5:1 minimum for text.
const BETTER_TEXT = 'text-green-700 dark:text-green-400';
const WORSE_TEXT = 'text-red-700 dark:text-red-400';
const SELECT_CLASS = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

const BETTER_LABEL: Record<MeasurementBetter, string> = {
  lower: 'Lower is better (e.g. a gap or a race time)',
  higher: 'Higher is better (e.g. a hold or a lift)',
};

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

const dateLabel = (date: string) => format(parseISO(date), 'MMM d, yyyy');

// "3 cm better" / "2 cm worse" — direction-aware, so a toe-touch gap that
// shrank reads as an improvement.
const describeChange = (group: MeasurementGroup): string | null => {
  if (group.change === undefined || group.change === 0 || group.improved === undefined) return null;
  return `${formatMeasurementValue(group.kind, Math.abs(group.change))} ${group.improved ? 'better' : 'worse'}`;
};

// ---------------------------------------------------------------------------
// New record: the first value of something you want to keep measuring.

interface NewRecordDialogProps { open: boolean; onOpenChange: (open: boolean) => void; }

function NewRecordDialog({ open, onOpenChange }: NewRecordDialogProps) {
  const { createMeasurement } = useData();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<MeasurementKind>('length');
  const [better, setBetter] = useState<MeasurementBetter>(defaultBetter('length'));
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(''); setDescription(''); setKind('length'); setBetter(defaultBetter('length'));
    setValue(''); setDate(todayStr()); setNotes('');
  };

  const changeKind = (next: MeasurementKind) => {
    setKind(next);
    setBetter(defaultBetter(next));
    setValue('');
  };

  const save = async () => {
    const parsed = parseMeasurementInput(kind, value);
    if (!name.trim()) { toast.error('Give the record a name.'); return; }
    if (parsed === undefined) { toast.error(`Enter a valid value (${KIND_INPUT_HINT[kind]}).`); return; }
    if (!date) { toast.error('Pick a date.'); return; }
    setSaving(true);
    try {
      await createMeasurement({
        measurementId: crypto.randomUUID(),
        name: name.trim(), description: description.trim() || undefined,
        kind, better, value: parsed, date, notes: notes.trim() || undefined,
      });
      toast.success('Record saved');
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save record:', error);
      toast.error('Could not save that record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New record</DialogTitle>
          <DialogDescription>
            Something you measure yourself, like the gap between your fingers and toes in a toe touch. You can log new values later and watch it change.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="record-name">Name</Label>
            <Input id="record-name" value={name} maxLength={NAME_MAX} onChange={e => setName(e.target.value)}
              placeholder="e.g. Toe touch" disabled={saving} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="record-description">Description (optional)</Label>
            <Textarea id="record-description" value={description} maxLength={TEXT_MAX} rows={2}
              onChange={e => setDescription(e.target.value)} disabled={saving}
              placeholder="e.g. Seated, legs straight, gap between fingertips and toes" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="record-kind">Measured in</Label>
              <select id="record-kind" className={SELECT_CLASS} value={kind} disabled={saving}
                onChange={e => changeKind(e.target.value as MeasurementKind)}>
                {(Object.keys(KIND_LABEL) as MeasurementKind[]).map(option => (
                  <option key={option} value={option}>{KIND_LABEL[option]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="record-better">What is an improvement?</Label>
              <select id="record-better" className={SELECT_CLASS} value={better} disabled={saving}
                onChange={e => setBetter(e.target.value as MeasurementBetter)}>
                {(Object.keys(BETTER_LABEL) as MeasurementBetter[]).map(option => (
                  <option key={option} value={option}>{BETTER_LABEL[option]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="record-value">Value</Label>
                <Input id="record-value" inputMode="text" value={value} onChange={e => setValue(e.target.value)}
                  disabled={saving} autoComplete="off" aria-describedby="record-value-hint" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="record-date">Date</Label>
                <Input id="record-date" type="date" value={date} onChange={e => setDate(e.target.value)} disabled={saving} />
              </div>
            </div>
            <p id="record-value-hint" className="mt-1 text-xs text-muted-foreground">{KIND_INPUT_HINT[kind]}</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="record-notes">Notes (optional)</Label>
            <Input id="record-notes" value={notes} maxLength={TEXT_MAX} onChange={e => setNotes(e.target.value)}
              disabled={saving} placeholder="e.g. after warm-up" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={() => void save()} disabled={saving}>Save record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// One record: history, chart, log another value, edit details, delete.

interface RecordDetailProps { group: MeasurementGroup; onClose: () => void; }

function RecordDetail({ group, onClose }: RecordDetailProps) {
  const { createMeasurement, updateMeasurement, deleteMeasurement } = useData();
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [better, setBetter] = useState<MeasurementBetter>(group.better);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const chartData = useMemo(() => group.entries.map(entry => ({
    label: format(parseISO(entry.date), 'MMM d'), value: entry.value,
  })), [group.entries]);
  const change = describeChange(group);

  const logValue = async () => {
    const parsed = parseMeasurementInput(group.kind, value);
    if (parsed === undefined) { toast.error(`Enter a valid value (${KIND_INPUT_HINT[group.kind]}).`); return; }
    if (!date) { toast.error('Pick a date.'); return; }
    setSaving(true);
    try {
      await createMeasurement({
        measurementId: group.measurementId, name: group.name, description: group.description,
        kind: group.kind, better: group.better, value: parsed, date, notes: notes.trim() || undefined,
      });
      toast.success('Value logged');
      setValue(''); setNotes('');
    } catch (error) {
      console.error('Failed to log value:', error);
      toast.error('Could not log that value. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Name, description and direction live on every entry, so an edit is
  // applied to all of them together.
  const saveDetails = async () => {
    if (!name.trim()) { toast.error('Give the record a name.'); return; }
    setSaving(true);
    try {
      for (const entry of group.entries) {
        await updateMeasurement(entry.id, {
          name: name.trim(), description: description.trim() || undefined, better,
        });
      }
      toast.success('Details updated');
      setEditing(false);
    } catch (error) {
      console.error('Failed to update record details:', error);
      toast.error('Could not update the details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (id: string) => {
    try {
      await deleteMeasurement(id);
      if (group.entries.length === 1) onClose();
    } catch (error) {
      console.error('Failed to delete entry:', error);
      toast.error('Could not delete that value.');
    }
  };

  const removeRecord = async () => {
    try {
      for (const entry of group.entries) await deleteMeasurement(entry.id);
      toast.success(`Deleted “${group.name}”`);
      onClose();
    } catch (error) {
      console.error('Failed to delete record:', error);
      toast.error('Could not delete that record.');
    }
  };

  return (
    <>
      <Dialog open onOpenChange={next => { if (!next && !saving) onClose(); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{group.name}</DialogTitle>
            <DialogDescription>
              {group.description ?? `${KIND_LABEL[group.kind]} · ${group.better === 'lower' ? 'lower' : 'higher'} is better`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 text-center">
            {([
              ['Latest', group.latest.value, group.latest.date],
              ['Best', group.best.value, group.best.date],
              ['First', group.first.value, group.first.date],
            ] as const).map(([label, stat, statDate]) => (
              <div key={label} className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="metric-number text-lg font-bold">{formatMeasurementValue(group.kind, stat)}</p>
                <p className="text-xs text-muted-foreground">{format(parseISO(statDate), 'MMM d')}</p>
              </div>
            ))}
          </div>
          {(change || group.isNewBest) && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              {group.isNewBest && <Badge className="gap-1"><Trophy className="h-3 w-3" />New best</Badge>}
              {change && (
                <span className={group.improved ? BETTER_TEXT : WORSE_TEXT}>
                  {change} than last time
                </span>
              )}
            </p>
          )}

          {group.entries.length >= 2 && (
            <div className="h-[200px]" role="img"
              aria-label={describeSeries(group.name, chartData.map(point => point.value), group.kind === 'time' ? 's' : group.kind === 'weight' ? 'kg' : 'cm')}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart accessibilityLayer data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" width={44} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatMeasurementValue(group.kind, v), group.name]} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Log a new value</p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="entry-value">Value</Label>
                <Input id="entry-value" className="w-28" value={value} onChange={e => setValue(e.target.value)}
                  disabled={saving} autoComplete="off" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="entry-date">Date</Label>
                <Input id="entry-date" type="date" className="w-40" value={date} onChange={e => setDate(e.target.value)} disabled={saving} />
              </div>
              <div className="min-w-[140px] flex-1 space-y-1">
                <Label htmlFor="entry-notes">Notes (optional)</Label>
                <Input id="entry-notes" value={notes} maxLength={TEXT_MAX} onChange={e => setNotes(e.target.value)} disabled={saving} />
              </div>
              <Button onClick={() => void logValue()} disabled={saving || !value}>Log</Button>
            </div>
            <p className="text-xs text-muted-foreground">{KIND_INPUT_HINT[group.kind]}</p>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">History</p>
            <ul aria-label="Logged values" className="max-h-48 space-y-1 overflow-y-auto">
              {[...group.entries].reverse().map(entry => (
                <li key={entry.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="metric-number font-semibold">{formatMeasurementValue(group.kind, entry.value)}</span>
                  <span className="text-muted-foreground">{dateLabel(entry.date)}</span>
                  {entry.id === group.best.id && <Trophy className="h-3.5 w-3.5 text-primary" aria-label="Best value" />}
                  {entry.notes && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{entry.notes}</span>}
                  <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 shrink-0"
                    aria-label={`Delete ${formatMeasurementValue(group.kind, entry.value)} on ${dateLabel(entry.date)}`}
                    onClick={() => void removeEntry(entry.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          {editing ? (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={name} maxLength={NAME_MAX} onChange={e => setName(e.target.value)} disabled={saving} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" rows={2} value={description} maxLength={TEXT_MAX}
                  onChange={e => setDescription(e.target.value)} disabled={saving} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-better">What is an improvement?</Label>
                <select id="edit-better" className={SELECT_CLASS} value={better} disabled={saving}
                  onChange={e => setBetter(e.target.value as MeasurementBetter)}>
                  {(Object.keys(BETTER_LABEL) as MeasurementBetter[]).map(option => (
                    <option key={option} value={option}>{BETTER_LABEL[option]}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                <Button onClick={() => void saveDetails()} disabled={saving}>Save details</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="outline" onClick={() => setEditing(true)}>Edit details</Button>
              <Button variant="outline" className={WORSE_TEXT} onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-2 h-4 w-4" />Delete record
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{group.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the record and all {group.entries.length} logged value{group.entries.length === 1 ? '' : 's'}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => void removeRecord()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------

export function MeasurementsCard() {
  const { measurements } = useData();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const groups = useMemo(() => groupMeasurements(measurements), [measurements]);
  // Looked up by id every render so the open dialog reflects new entries.
  const openGroup = groups.find(group => group.measurementId === openId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Ruler className="h-5 w-5" />My Records</CardTitle>
            <CardDescription>
              Log anything you measure yourself — a toe-touch gap, a plank hold, a lift — and watch it improve.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreating(true)} className="shrink-0">
            <Plus className="mr-1 h-4 w-4" />New record
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No records yet. Try “Toe touch”: measure the gap between your fingertips and toes, and log it again every few weeks.
          </p>
        ) : (
          <ul className="space-y-3">
            {groups.map(group => {
              const change = describeChange(group);
              return (
                <li key={group.measurementId}>
                  <button
                    type="button"
                    onClick={() => setOpenId(group.measurementId)}
                    className="flex w-full items-start gap-2 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {group.name}
                        {group.isNewBest && <Badge className="gap-1"><Trophy className="h-3 w-3" />New best</Badge>}
                      </p>
                      {group.description && <p className="truncate text-xs text-muted-foreground">{group.description}</p>}
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>
                          Latest: <span className="metric-number text-base font-bold text-foreground">{formatMeasurementValue(group.kind, group.latest.value)}</span>
                          {' '}<span className="text-xs">({dateLabel(group.latest.date)})</span>
                        </span>
                        {group.entries.length > 1 && (
                          <span>Best: <span className="font-medium text-foreground">{formatMeasurementValue(group.kind, group.best.value)}</span></span>
                        )}
                        {change && <span className={group.improved ? BETTER_TEXT : WORSE_TEXT}>{change}</span>}
                      </div>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <NewRecordDialog open={creating} onOpenChange={setCreating} />
      {openGroup && <RecordDetail key={openGroup.measurementId} group={openGroup} onClose={() => setOpenId(null)} />}
    </Card>
  );
}
