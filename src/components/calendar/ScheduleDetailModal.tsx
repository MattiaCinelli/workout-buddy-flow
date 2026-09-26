import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { Ban, Calendar, CalendarClock, CheckCircle2, Clock, Info, Repeat, Trash2, Play, Loader2, Pencil } from 'lucide-react';
import { useData } from '@/contexts/useData';
import { ExpandedScheduledWorkout } from '@/hooks/useScheduledWorkouts';
import { scheduledWorkoutSessionUrl } from '@/lib/workoutSessionUrl';
import { weekDays, weekDayLabels, weekdaysPreset, weekendPreset, WeekDay } from '@/data/scheduledWorkouts';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isScheduledOccurrenceCompleted } from '@/lib/scheduleCompletion';
import { ToastAction } from '@/components/ui/toast';
import { useMarkWorkoutDone } from '@/hooks/useMarkWorkoutDone';

interface ScheduleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ExpandedScheduledWorkout | null;
  onDeleted: () => void;
  onEdit: (schedule: ExpandedScheduledWorkout) => void;
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onDeleted,
  onEdit,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveDate, setMoveDate] = useState('');
  const [recovering, setRecovering] = useState(false);
  const { toast } = useToast();
  const { workouts, sessions, scheduledWorkouts, createScheduledWorkout, updateScheduledWorkout, deleteScheduledWorkout, restoreScheduledWorkout } = useData();
  const navigate = useNavigate();
  const { markDone, savingKey } = useMarkWorkoutDone();

  if (!schedule) return null;

  const workout = workouts.find(w => w.id === schedule.workoutId);
  const completed = isScheduledOccurrenceCompleted(schedule, sessions);
  const missed = !schedule.skipped && !completed && schedule.displayDate < format(new Date(), 'yyyy-MM-dd');
  // Today or earlier only: a workout can't be done ahead of its day. A
  // skipped one is unskipped first, so the two states never overlap.
  const canMarkDone = !!workout && !completed && !schedule.skipped
    && schedule.displayDate <= format(new Date(), 'yyyy-MM-dd');
  const matchingCourseOccurrences = schedule.courseId
    ? scheduledWorkouts.filter(item => item.courseId === schedule.courseId && item.workoutId === schedule.workoutId)
    : [];
  const futureCourseOccurrences = matchingCourseOccurrences.filter(item => item.startDate >= schedule.displayDate);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'strength':
        return 'bg-workout-blue/20 text-workout-blue border-workout-blue';
      case 'cardio':
        return 'bg-workout-red/20 text-workout-red border-workout-red';
      case 'flexibility':
        return 'bg-workout-green/20 text-workout-green border-workout-green';
      case 'balance':
        return 'bg-purple-500/20 text-purple-600 border-purple-500';
      case 'warm-up':
        return 'bg-workout-orange/20 text-workout-orange border-workout-orange';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/40';
    }
  };

  // Order- and length-independent equality, since a toggle group's selection
  // order doesn't necessarily match canonical weekday order.
  const isSameDaySet = (a: WeekDay[], b: WeekDay[]) =>
    a.length === b.length && new Set(a).size === new Set([...a, ...b]).size;

  const getRecurrenceLabel = () => {
    if (schedule.recurrence === 'none') return 'One-time';
    if (schedule.recurrence === 'daily') return 'Every day';
    if (schedule.recurrence === 'weekly' && schedule.recurrenceDays?.length) {
      const days = schedule.recurrenceDays;
      if (isSameDaySet(days, weekdaysPreset)) return 'Every weekday (Mon–Fri)';
      if (isSameDaySet(days, weekendPreset)) return 'Every weekend';
      const sorted = weekDays.filter(day => days.includes(day));
      return `Every ${sorted.map(day => weekDayLabels[day]).join(', ')}`;
    }
    return 'Recurring';
  };

  const handleDelete = async (scope: 'one' | 'future') => {
    setIsDeleting(true);
    try {
      const targets = scope === 'future' && schedule.courseId
        ? futureCourseOccurrences
        : [schedule];
      const deleted = (await Promise.all(targets.map(item => deleteScheduledWorkout(item.id))))
        .filter((item): item is NonNullable<typeof item> => !!item);
      toast({
        title: scope === 'future' ? "Future calendar entries deleted" : "Calendar occurrence deleted",
        description: scope === 'future'
          ? `Removed ${targets.length} entries from this date onward. Past entries and the course plan were not changed.`
          : "The calendar entry was removed. The course plan was not changed.",
        action: deleted.length ? <ToastAction altText="Undo calendar deletion" onClick={() => void Promise.all(deleted.map(restoreScheduledWorkout))}>Undo</ToastAction> : undefined,
      });
      onDeleted();
      onClose();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      toast({
        title: "Error",
        description: "Failed to delete schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleStartWorkout = () => {
    onClose();
    navigate(scheduledWorkoutSessionUrl(schedule));
  };

  const handleMarkDone = async () => {
    if (await markDone(schedule)) onClose();
  };

  const handleViewWorkout = () => {
    onClose();
    navigate(`/workouts/${schedule.workoutId}`);
  };

  const toggleSkipped = async () => {
    setRecovering(true);
    try {
      const skippedDates = schedule.skipped
        ? (schedule.skippedDates ?? []).filter(date => date !== schedule.displayDate)
        : [...new Set([...(schedule.skippedDates ?? []), schedule.displayDate])];
      await updateScheduledWorkout(schedule.id, { skippedDates });
      toast({ title: schedule.skipped ? 'Workout restored' : 'Workout marked skipped' });
      onClose();
    } catch {
      toast({ title: 'Could not update workout', description: 'Please try again.', variant: 'destructive' });
    } finally { setRecovering(false); }
  };

  const moveOccurrence = async () => {
    if (!moveDate) return;
    setRecovering(true);
    let createdScheduleId: string | undefined;
    try {
      if (schedule.recurrence === 'none') {
        await updateScheduledWorkout(schedule.id, { startDate: moveDate });
      } else {
        const skippedDates = [...new Set([...(schedule.skippedDates ?? []), schedule.displayDate])];
        const created = await createScheduledWorkout({ workoutId: schedule.workoutId, startDate: moveDate,
          startTime: schedule.startTime, endTime: schedule.endTime, recurrence: 'none', notes: schedule.notes,
          courseId: schedule.courseId, courseItemId: schedule.courseItemId });
        createdScheduleId = created.id;
        await updateScheduledWorkout(schedule.id, { skippedDates });
      }
      toast({ title: 'Workout rescheduled', description: `Moved to ${format(parseISO(moveDate), 'MMMM d, yyyy')}.` });
      setMoveOpen(false); onClose();
    } catch {
      if (createdScheduleId) await deleteScheduledWorkout(createdScheduleId).catch(() => null);
      toast({ title: 'Could not reschedule workout', description: 'No calendar changes were completed.', variant: 'destructive' });
    } finally { setRecovering(false); }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {workout?.title || 'Scheduled Workout'}
              {workout && (
                <Badge variant="outline" className={getCategoryColor(workout.category)}>
                  {workout.category}
                </Badge>
              )}
              {schedule.skipped && <Badge className="bg-amber-500 text-white hover:bg-amber-500">Skipped</Badge>}
              {completed && <Badge className="bg-workout-green text-white">Done</Badge>}
              {missed && <Badge variant="destructive">Missed</Badge>}
            </DialogTitle>
            <DialogDescription>
              Scheduled workout details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date */}
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {format(parseISO(schedule.displayDate), 'EEEE, MMMM d, yyyy')}
                </div>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{schedule.startTime}</div>
                {workout && (
                  <div className="text-sm text-muted-foreground">
                    ~{workout.duration} minutes
                  </div>
                )}
              </div>
            </div>

            {/* Recurrence */}
            <div className="flex items-center gap-3">
              <Repeat className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{getRecurrenceLabel()}</div>
                {schedule.endRecurrenceDate && (
                  <div className="text-sm text-muted-foreground">
                    Until {format(parseISO(schedule.endRecurrenceDate), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {schedule.notes && (
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground mb-1">Notes</div>
                <div className="text-sm">{schedule.notes}</div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className={`grid gap-2 ${canMarkDone ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <Button
                className={completed ? undefined : 'bg-workout-green text-white hover:bg-green-600'}
                variant={completed ? 'outline' : 'default'}
                disabled={completed}
                onClick={handleStartWorkout}
              >
                {completed
                  ? <CheckCircle2 className="completion-check h-4 w-4 mr-2" />
                  : <Play className="h-4 w-4 mr-2" />}
                {completed ? 'Done' : 'Start'}
              </Button>
              {canMarkDone && (
                <Button variant="outline" onClick={() => void handleMarkDone()} disabled={savingKey !== null}>
                  {savingKey !== null
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <CheckCircle2 className="h-4 w-4 mr-2 text-workout-green" />}
                  Mark done
                </Button>
              )}
            </div>
            {/* Secondary actions as labelled icons: five fit the narrowest
                phone without the row scrolling sideways. */}
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: 'Move', icon: CalendarClock, onClick: () => { setMoveDate(schedule.displayDate); setMoveOpen(true); }, disabled: recovering },
                { label: schedule.skipped ? 'Unskip' : 'Skip', icon: Ban, onClick: () => void toggleSkipped(), disabled: recovering },
                { label: 'Edit', icon: Pencil, onClick: () => onEdit(schedule) },
                { label: 'Details', icon: Info, onClick: handleViewWorkout },
                { label: 'Delete', icon: Trash2, onClick: () => setShowDeleteConfirm(true), disabled: isDeleting, destructive: true },
              ].map(({ label, icon: Icon, onClick, disabled, destructive }) => (
                <Button
                  key={label}
                  variant="outline"
                  onClick={onClick}
                  disabled={disabled}
                  className={`h-auto min-w-0 flex-col gap-1 px-1 py-2 text-xs ${destructive ? 'text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400' : ''}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Move this workout</DialogTitle><DialogDescription>
            {schedule.recurrence === 'none' ? 'Choose a new date.' : 'Only this occurrence moves; the recurring schedule stays unchanged.'}
          </DialogDescription></DialogHeader>
          <div className="space-y-2"><Label htmlFor="move-workout-date">New date</Label>
            <Input id="move-workout-date" type="date" value={moveDate} onChange={event => setMoveDate(event.target.value)} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMoveOpen(false)}>Cancel</Button>
            <Button onClick={() => void moveOccurrence()} disabled={!moveDate || recovering}>Move workout</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Workout</AlertDialogTitle>
            <AlertDialogDescription>
              {schedule.courseId && futureCourseOccurrences.length > 1
                ? `This workout has ${futureCourseOccurrences.length} calendar entries from this date onward. Past entries and the course plan will not be changed.`
                : schedule.recurrence !== 'none'
                ? "This will delete all occurrences of this recurring workout. Are you sure?"
                : "Remove this workout from the calendar? The course plan will not be changed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete('one')}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                schedule.courseId ? 'Remove this calendar entry' : 'Delete'
              )}
            </AlertDialogAction>
            {schedule.courseId && futureCourseOccurrences.length > 1 && (
              <AlertDialogAction
                onClick={() => void handleDelete('future')}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove all {futureCourseOccurrences.length} future entries
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ScheduleDetailModal;
