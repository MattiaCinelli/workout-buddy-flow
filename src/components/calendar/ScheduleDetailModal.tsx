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
import { Calendar, Clock, Repeat, Trash2, Play, Loader2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { ExpandedScheduledWorkout } from '@/hooks/useScheduledWorkouts';
import { weekDayLabels } from '@/data/scheduledWorkouts';
import { format, parseISO } from 'date-fns';

interface ScheduleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ExpandedScheduledWorkout | null;
  onDeleted: () => void;
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onDeleted,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { workouts, deleteScheduledWorkout } = useData();
  const navigate = useNavigate();

  if (!schedule) return null;

  const workout = workouts.find(w => w.id === schedule.workoutId);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'strength':
        return 'bg-workout-blue/20 text-workout-blue border-workout-blue';
      case 'cardio':
        return 'bg-workout-orange/20 text-workout-orange border-workout-orange';
      case 'flexibility':
        return 'bg-workout-green/20 text-workout-green border-workout-green';
      case 'balance':
        return 'bg-purple-500/20 text-purple-600 border-purple-500';
      default:
        return 'bg-gray-200 text-gray-600 border-gray-400';
    }
  };

  const getRecurrenceLabel = () => {
    if (schedule.recurrence === 'none') return 'One-time';
    if (schedule.recurrence === 'daily') return 'Every day';
    if (schedule.recurrence === 'weekly' && schedule.recurrenceDay) {
      return `Every ${weekDayLabels[schedule.recurrenceDay]}`;
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
    navigate(`/workout/${schedule.workoutId}/start`);
  };

  const handleViewWorkout = () => {
    onClose();
    navigate(`/workout/${schedule.workoutId}`);
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
