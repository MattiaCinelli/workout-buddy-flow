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
import { Ban, Calendar, CalendarClock, Clock, Repeat, Trash2, Play, Loader2, Pencil } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { ExpandedScheduledWorkout } from '@/hooks/useScheduledWorkouts';
import { weekDays, weekDayLabels, weekdaysPreset, weekendPreset, WeekDay } from '@/data/scheduledWorkouts';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const { workouts, sessions, createScheduledWorkout, updateScheduledWorkout, deleteScheduledWorkout } = useData();
  const navigate = useNavigate();

  if (!schedule) return null;

  const workout = workouts.find(w => w.id === schedule.workoutId);
  const completed = sessions.some(session => session.scheduledWorkoutId === schedule.id
    && session.completedAt.slice(0, 10) === schedule.displayDate);
  const missed = !schedule.skipped && !completed && schedule.displayDate < format(new Date(), 'yyyy-MM-dd');

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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteScheduledWorkout(schedule.id);
      toast({
        title: "Schedule deleted",
        description: "The scheduled workout has been removed.",
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
    navigate(`/workouts/${schedule.workoutId}/session?scheduledWorkoutId=${schedule.id}`);
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
          startTime: schedule.startTime, endTime: schedule.endTime, recurrence: 'none', notes: schedule.notes });
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
              {schedule.skipped && <Badge variant="secondary">Skipped</Badge>}
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="sm:mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setMoveDate(schedule.displayDate); setMoveOpen(true); }} disabled={recovering}>
                <CalendarClock className="h-4 w-4 sm:mr-2" /><span className="sr-only sm:not-sr-only">Move</span>
              </Button>
              <Button variant="outline" onClick={() => void toggleSkipped()} disabled={recovering}>
                <Ban className="h-4 w-4 sm:mr-2" /><span className="sr-only sm:not-sr-only">{schedule.skipped ? 'Unskip' : 'Skip'}</span>
              </Button>
              <Button variant="outline" size="icon" onClick={() => onEdit(schedule)} aria-label="Edit schedule">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleViewWorkout}>
                View Details
              </Button>
              <Button
                className="bg-workout-green hover:bg-green-600"
                onClick={handleStartWorkout}
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            </div>
          </DialogFooter>
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
              {schedule.recurrence !== 'none'
                ? "This will delete all occurrences of this recurring workout. Are you sure?"
                : "Are you sure you want to remove this scheduled workout?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ScheduleDetailModal;
