import { ArrowDown, ArrowUp, Dumbbell, Plus, Trash2, Bed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CourseWorkout } from '@/data/courses';
import { WorkoutEntry } from '@/data/workoutHistory';

interface Props {
  items: CourseWorkout[];
  workouts: WorkoutEntry[];
  onChange: (items: CourseWorkout[]) => void;
}

const CourseProgramBuilder = ({ items, workouts, onChange }: Props) => {
  const update = (id: string, patch: Partial<CourseWorkout>) =>
    onChange(items.map(item => item.id === id ? { ...item, ...patch } : item));

  const addWorkout = () => {
    if (!workouts[0]) return;
    onChange([...items, {
      id: crypto.randomUUID(), type: 'workout', workoutId: workouts[0].id,
      order: items.length + 1, week: 1, day: 1, completed: false
    }]);
  };

  const addRest = () => onChange([...items, {
    id: crypto.randomUUID(), type: 'rest', order: items.length + 1,
    week: 1, day: 1, title: 'Recovery day', completed: false
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

  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <div>
        <Label>Program schedule</Label>
        <p className="text-xs text-muted-foreground">Add repeatable sessions and recovery days, then place each in a week and day.</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addRest}><Bed className="h-4 w-4 mr-1" />Rest</Button>
        <Button type="button" size="sm" onClick={addWorkout} disabled={!workouts.length}><Plus className="h-4 w-4 mr-1" />Workout</Button>
      </div>
    </div>
    {items.length === 0 && <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Add the first workout or recovery day.</div>}
    {items.map((item, index) => <Card key={item.id}>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          {item.type === 'workout' ? <Dumbbell className="h-4 w-4 text-primary" /> : <Bed className="h-4 w-4 text-primary" />}
          <span className="font-medium flex-1">{item.type === 'workout' ? `Session ${index + 1}` : 'Recovery'}</span>
          <Button type="button" variant="ghost" size="icon" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => move(index, 1)} disabled={index === items.length - 1}><ArrowDown className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Week</Label><Input type="number" min={1} value={item.week} onChange={e => update(item.id, { week: Math.max(1, Number(e.target.value)) })} /></div>
          <div><Label>Day</Label><Input type="number" min={1} max={7} value={item.day} onChange={e => update(item.id, { day: Math.min(7, Math.max(1, Number(e.target.value))) })} /></div>
        </div>
        {item.type === 'workout' ? <Select value={item.workoutId} onValueChange={workoutId => update(item.id, { workoutId })}>
          <SelectTrigger><SelectValue placeholder="Choose workout" /></SelectTrigger>
          <SelectContent>{workouts.map(workout => <SelectItem key={workout.id} value={workout.id}>{workout.title}</SelectItem>)}</SelectContent>
        </Select> : <Input value={item.title || ''} onChange={e => update(item.id, { title: e.target.value })} placeholder="Recovery day title" />}
        <Textarea value={item.instructions || ''} onChange={e => update(item.id, { instructions: e.target.value })} placeholder={item.type === 'workout' ? 'Session instructions, targets or substitutions…' : 'Recovery guidance, mobility or sleep target…'} rows={2} />
      </CardContent>
    </Card>)}
  </div>;
};

export default CourseProgramBuilder;
