import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { RecurrenceType, WeekDay, weekDayLabels, getDayOfWeek } from '@/data/scheduledWorkouts';
import { format, parseISO } from 'date-fns';

interface ScheduleWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  onScheduleCreated: () => void;
}

const ScheduleWorkoutModal: React.FC<ScheduleWorkoutModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onScheduleCreated,
}) => {
  const [workoutId, setWorkoutId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceDay, setRecurrenceDay] = useState<WeekDay>('monday');
  const [endRecurrenceDate, setEndRecurrenceDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const { workouts, createScheduledWorkout } = useData();

  // Initialize date when modal opens
  useEffect(() => {
    if (isOpen && selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      setStartDate(dateStr);
      setRecurrenceDay(getDayOfWeek(selectedDate));
    }
  }, [isOpen, selectedDate]);

  const resetForm = () => {
    setWorkoutId('');
    setStartDate('');
    setStartTime('09:00');
    setRecurrence('none');
    setRecurrenceDay('monday');
    setEndRecurrenceDate('');
    setNotes('');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workoutId || !startDate || !startTime) {
      toast({
        title: "Missing information",
        description: "Please select a workout, date, and time.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createScheduledWorkout({
        workoutId,
        startDate,
        startTime,
        recurrence,
        recurrenceDay: recurrence === 'weekly' ? recurrenceDay : undefined,
        endRecurrenceDate: recurrence !== 'none' && endRecurrenceDate ? endRecurrenceDate : undefined,
        notes: notes || undefined,
      });

      toast({
        title: "Workout scheduled!",
        description: recurrence !== 'none' 
          ? "Recurring workout has been added to your calendar."
          : "Workout has been added to your calendar.",
      });

      resetForm();
      onScheduleCreated();
      onClose();
    } catch (error) {
      console.error('Failed to schedule workout:', error);
      toast({
        title: "Error",
        description: "Failed to schedule workout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Workout</DialogTitle>
          <DialogDescription>
            Add a workout to your calendar. You can set it to repeat daily or weekly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Workout Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workout" className="text-right">
                Workout
              </Label>
              <Select value={workoutId} onValueChange={setWorkoutId} disabled={isSubmitting}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a workout" />
                </SelectTrigger>
                <SelectContent>
                  {workouts.map((workout) => (
                    <SelectItem key={workout.id} value={workout.id}>
                      {workout.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value) {
                    setRecurrenceDay(getDayOfWeek(parseISO(e.target.value)));
                  }
                }}
                className="col-span-3"
                disabled={isSubmitting}
              />
            </div>

            {/* Time */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="col-span-3"
                disabled={isSubmitting}
              />
            </div>

            {/* Recurrence */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recurrence" className="text-right">
                Repeat
              </Label>
              <Select 
                value={recurrence} 
                onValueChange={(value) => setRecurrence(value as RecurrenceType)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Every day</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Day of week for weekly recurrence */}
            {recurrence === 'weekly' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="day" className="text-right">
                  Every
                </Label>
                <Select
                  value={recurrenceDay}
                  onValueChange={(value) => setRecurrenceDay(value as WeekDay)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(weekDayLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* End recurrence date */}
            {recurrence !== 'none' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDate" className="text-right">
                  Until
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endRecurrenceDate}
                  onChange={(e) => setEndRecurrenceDate(e.target.value)}
                  className="col-span-3"
                  placeholder="No end date"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* Notes */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-3"
                placeholder="Optional notes..."
                rows={2}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-workout-blue hover:bg-blue-600"
              disabled={!workoutId || !startDate || !startTime || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Schedule'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleWorkoutModal;
