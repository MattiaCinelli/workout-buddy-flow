import { useState } from 'react';
import { ArrowDown, ArrowUp, CalendarPlus, Dumbbell, Plus, Trash2, Bed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CourseWorkout } from '@/data/courses';
import { WorkoutEntry } from '@/data/workoutHistory';

interface Props {
  items: CourseWorkout[];
  workouts: WorkoutEntry[];
  onChange: (items: CourseWorkout[]) => void;
}

// "day" on a CourseWorkout is an offset from the course's start date, not a
// weekday — day 1 is whatever date the user starts the course on (see
// CourseScheduleModal). The chips are numbered to match the per-session
// Day field below rather than pretending to be Mon–Sun.
const DAYS = [1, 2, 3, 4, 5, 6, 7];

const CourseProgramBuilder = ({ items, workouts, onChange }: Props) => {
  const [bulkWorkoutId, setBulkWorkoutId] = useState<string | undefined>(undefined);
  const [weekFrom, setWeekFrom] = useState(1);
  const [weekTo, setWeekTo] = useState(1);
  const [days, setDays] = useState<string[]>(['1', '2', '3', '4', '5']);

  const update = (id: string, patch: Partial<CourseWorkout>) =>
    onChange(items.map(item => item.id === id ? { ...item, ...patch } : item));

  const maxOrder = () => (items.length ? Math.max(...items.map(item => item.order)) : 0);

  const weekLo = Math.min(weekFrom, weekTo);
  const weekHi = Math.max(weekFrom, weekTo);
  const plannedCount = (weekHi - weekLo + 1) * days.length;

  // Expands "this workout, weeks X–Y, these days" into one CourseWorkout per
  // (week, day), appended in schedule order. Every other session is left
  // untouched so a partly-built program isn't reshuffled.
  const addRange = () => {
    if (!bulkWorkoutId || days.length === 0) return;
    const chosenDays = days.map(Number).sort((a, b) => a - b);
    const additions: CourseWorkout[] = [];
    let order = maxOrder();
    for (let week = weekLo; week <= weekHi; week += 1) {
      for (const day of chosenDays) {
        order += 1;
        additions.push({ id: crypto.randomUUID(), type: 'workout', workoutId: bulkWorkoutId, order, week, day, completed: false });
      }
    }
    onChange([...items, ...additions]);
  };

  const addSingle = () => onChange([...items, {
    id: crypto.randomUUID(), type: 'workout', order: maxOrder() + 1, week: 1, day: 1, completed: false,
  }]);

  const addRest = () => onChange([...items, {
    id: crypto.randomUUID(), type: 'rest', order: maxOrder() + 1, week: 1, day: 1, title: 'Recovery day', completed: false,
  }]);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((item, order) => ({ ...item, order: order + 1 })));
  };

  const remove = (id: string) =>
    onChange(items.filter(item => item.id !== id).map((item, order) => ({ ...item, order: order + 1 })));

  const incompleteSessions = items.some(item => item.type === 'workout' && !item.workoutId);

  return <div className="space-y-4">
    <div className="space-y-3 rounded-md border bg-muted/40 p-3">
      <div className="flex items-center gap-2">
        <CalendarPlus className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Add sessions across a range</p>
      </div>
      {workouts.length === 0 ? (
        <p className="text-xs text-muted-foreground">Create a workout first — a course is built from workouts you already have.</p>
      ) : <>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Workout</Label>
            <Select value={bulkWorkoutId} onValueChange={setBulkWorkoutId}>
              <SelectTrigger><SelectValue placeholder="Choose a workout" /></SelectTrigger>
              <SelectContent>
                {workouts.map(workout => <SelectItem key={workout.id} value={workout.id}>{workout.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Weeks</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={1} value={weekFrom} aria-label="First week"
                onChange={e => setWeekFrom(Math.max(1, Number(e.target.value) || 1))} className="w-16" />
              <span className="text-sm text-muted-foreground">to</span>
              <Input type="number" min={1} value={weekTo} aria-label="Last week"
                onChange={e => setWeekTo(Math.max(1, Number(e.target.value) || 1))} className="w-16" />
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Days <span className="font-normal text-muted-foreground">— day 1 = your start date</span></Label>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs"
                onClick={() => setDays(['1', '2', '3', '4', '5'])}>Days 1–5</Button>
              <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs"
                onClick={() => setDays(DAYS.map(String))}>All 7</Button>
            </div>
          </div>
          <ToggleGroup type="multiple" value={days} onValueChange={setDays} className="flex-wrap justify-start">
            {DAYS.map(day => (
              <ToggleGroupItem key={day} value={String(day)} className="h-8 w-9 px-0 text-xs">{day}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <Button type="button" size="sm" onClick={addRange} disabled={!bulkWorkoutId || days.length === 0}>
          <Plus className="mr-1 h-4 w-4" />
          Add {bulkWorkoutId && days.length ? `${plannedCount} session${plannedCount === 1 ? '' : 's'}` : 'sessions'}
        </Button>
      </>}
    </div>

    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label>Program schedule</Label>
          <p className="text-xs text-muted-foreground">Fine-tune each session's week, day and notes, or reorder them.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={addRest}><Bed className="mr-1 h-4 w-4" />Rest</Button>
          <Button type="button" size="sm" variant="outline" onClick={addSingle} disabled={!workouts.length}><Plus className="mr-1 h-4 w-4" />Single</Button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No sessions yet — use “Add sessions across a range” above.
        </div>
      )}
      {incompleteSessions && (
        <p className="text-xs text-destructive">Some sessions still need a workout selected.</p>
      )}

      {items.map((item, index) => {
        const needsWorkout = item.type === 'workout' && !item.workoutId;
        const title = item.type === 'workout'
          ? (workouts.find(workout => workout.id === item.workoutId)?.title ?? 'Session')
          : 'Recovery';
        return <Card key={item.id} className={needsWorkout ? 'border-destructive' : undefined}>
          <CardContent className="space-y-3 p-3">
            <div className="flex items-center gap-2">
              {item.type === 'workout' ? <Dumbbell className="h-4 w-4 text-primary" /> : <Bed className="h-4 w-4 text-primary" />}
              <span className="flex-1 font-medium">{index + 1}. {title}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => move(index, 1)} disabled={index === items.length - 1}><ArrowDown className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Week</Label><Input type="number" min={1} value={item.week} onChange={e => update(item.id, { week: Math.max(1, Number(e.target.value) || 1) })} /></div>
              <div><Label>Day</Label><Input type="number" min={1} max={7} value={item.day} onChange={e => update(item.id, { day: Math.min(7, Math.max(1, Number(e.target.value) || 1)) })} /></div>
            </div>
            {item.type === 'workout' ? (
              <Select value={item.workoutId} onValueChange={workoutId => update(item.id, { workoutId })}>
                <SelectTrigger className={needsWorkout ? 'border-destructive' : undefined}><SelectValue placeholder="Choose workout" /></SelectTrigger>
                <SelectContent>{workouts.map(workout => <SelectItem key={workout.id} value={workout.id}>{workout.title}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Input value={item.title || ''} onChange={e => update(item.id, { title: e.target.value })} placeholder="Recovery day title" />
            )}
            <Textarea value={item.instructions || ''} onChange={e => update(item.id, { instructions: e.target.value })}
              placeholder={item.type === 'workout' ? 'Session instructions, targets or substitutions…' : 'Recovery guidance, mobility or sleep target…'} rows={2} />
          </CardContent>
        </Card>;
      })}
    </div>
  </div>;
};

export default CourseProgramBuilder;
