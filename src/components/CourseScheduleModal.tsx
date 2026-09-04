import { useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { CalendarPlus } from 'lucide-react';
import { Course } from '@/data/courses';
import { useData } from '@/contexts/DataContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { addMinutesToTime, sortCourseItems } from '@/lib/courseSchedule';

interface Props { course: Course; open: boolean; onOpenChange: (open: boolean) => void; }

const CourseScheduleModal = ({ course, open, onOpenChange }: Props) => {
  const { createScheduledWorkout, workouts } = useData();
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('18:00');
  const [saving, setSaving] = useState(false);

  const schedule = async () => {
    const sessions = sortCourseItems(course.workouts).filter(item => item.type === 'workout' && item.workoutId);
    if (!sessions.length) return;
    setSaving(true);
    try {
      const elapsedByDay = new Map<string, number>();
      const scheduled = sessions.map(item => {
        const dayKey = `${item.week}-${item.day}`;
        const elapsed = elapsedByDay.get(dayKey) ?? 0;
        const workout = workouts.find(candidate => candidate.id === item.workoutId);
        elapsedByDay.set(dayKey, elapsed + (workout?.duration ?? 0));
        return {
          workoutId: item.workoutId!,
          startDate: format(addDays(parseISO(startDate), (item.week - 1) * 7 + item.day - 1), 'yyyy-MM-dd'),
          startTime: addMinutesToTime(startTime, elapsed),
          endTime: workout ? addMinutesToTime(startTime, elapsed + workout.duration) : undefined,
          recurrence: 'none' as const,
          notes: `${course.title}${item.instructions ? ` — ${item.instructions}` : ''}`,
          courseId: course.id,
          courseItemId: item.id,
        };
      });
      await Promise.all(scheduled.map(item => createScheduledWorkout(item)));
      toast.success(`${sessions.length} course sessions added to the calendar`);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to schedule course:', error);
      toast.error('Could not schedule the course');
    } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>Schedule entire course</DialogTitle><DialogDescription>The selected date becomes week 1, day 1. Only workouts you explicitly added are scheduled. Multiple workouts on one day are placed consecutively in their displayed order.</DialogDescription></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Program start</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div className="space-y-2"><Label>Default time</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving || !startDate || !startTime} onClick={schedule}><CalendarPlus className="h-4 w-4 mr-2" />Schedule course</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
};

export default CourseScheduleModal;
