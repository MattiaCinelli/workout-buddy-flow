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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import {
  RecurrenceType, WeekDay, ScheduledWorkout, weekDays, weekDayShortLabels, weekdaysPreset, weekendPreset, getDayOfWeek,
} from '@/data/scheduledWorkouts';
import { format, parseISO } from 'date-fns';

interface ScheduleWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  onScheduleCreated: () => void;
  // When set, the modal edits this existing schedule (all its occurrences,
  // same as delete already does) instead of creating a new one.
  editingSchedule?: ScheduledWorkout | null;
}

const ScheduleWorkoutModal: React.FC<ScheduleWorkoutModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onScheduleCreated,
  editingSchedule,
}) => {
  const [workoutId, setWorkoutId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceDays, setRecurrenceDays] = useState<WeekDay[]>([]);
  const [endRecurrenceDate, setEndRecurrenceDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const { workouts, createScheduledWorkout, updateScheduledWorkout } = useData();
  const isEditing = !!editingSchedule;

  // Initialize the form when the modal opens: from the schedule being
  // edited, or a fresh one seeded from the clicked calendar date.
  useEffect(() => {
    if (!isOpen) return;
    if (editingSchedule) {
      setWorkoutId(editingSchedule.workoutId);
      setStartDate(editingSchedule.startDate);
      setStartTime(editingSchedule.startTime);
      setRecurrence(editingSchedule.recurrence);
      setRecurrenceDays(editingSchedule.recurrenceDays ?? []);
      setEndRecurrenceDate(editingSchedule.endRecurrenceDate ?? '');
      setNotes(editingSchedule.notes ?? '');
    } else if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      setStartDate(dateStr);
      setRecurrenceDays([getDayOfWeek(selectedDate)]);
    }
  }, [isOpen, selectedDate, editingSchedule]);

  const resetForm = () => {
    setWorkoutId('');
    setStartDate('');
    setStartTime('09:00');
    setRecurrence('none');
    setRecurrenceDays([]);
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

    if (recurrence === 'weekly' && recurrenceDays.length === 0) {
      toast({
        title: "Missing information",
        description: "Please select at least one day of the week.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const fields = {
        workoutId,
        startDate,
        startTime,
        recurrence,
        recurrenceDays: recurrence === 'weekly' ? recurrenceDays : undefined,
        endRecurrenceDate: recurrence !== 'none' && endRecurrenceDate ? endRecurrenceDate : undefined,
        notes: notes || undefined,
      };

      if (isEditing && editingSchedule) {
        await updateScheduledWorkout(editingSchedule.id, fields);
        toast({ title: "Schedule updated", description: "Your changes have been saved." });
      } else {
        await createScheduledWorkout(fields);
        toast({
          title: "Workout scheduled!",
          description: recurrence !== 'none'
            ? "Recurring workout has been added to your calendar."
            : "Workout has been added to your calendar.",
        });
      }

      resetForm();
      onScheduleCreated();
      onClose();
    } catch (error) {
      console.error('Failed to save scheduled workout:', error);
      toast({
        title: "Error",
        description: "Failed to save. Please try again.",
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
          <DialogTitle>{isEditing ? 'Edit Scheduled Workout' : 'Schedule Workout'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Changes apply to every occurrence of this schedule.'
              : 'Add a workout to your calendar. You can set it to repeat daily or weekly.'}
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
                    setRecurrenceDays([getDayOfWeek(parseISO(e.target.value))]);
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

            {/* Recurrence details — grouped into one card so "which days" and
                "until when" read as sub-options of Repeat, not more top-level
                form rows. */}
            {recurrence !== 'none' && (
              <div className="grid grid-cols-4 items-start gap-4 -mt-2">
                <div />
                <div className="col-span-3 rounded-md border bg-muted/40 p-3 space-y-3">
                  {recurrence === 'weekly' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Every</Label>
                      <ToggleGroup
                        type="multiple"
                        value={recurrenceDays}
                        onValueChange={(value) => setRecurrenceDays(value as WeekDay[])}
                        className="justify-start flex-wrap"
                        disabled={isSubmitting}
                      >
                        {weekDays.map((day) => (
                          <ToggleGroupItem key={day} value={day} aria-label={day} className="h-8 px-2.5 text-xs">
                            {weekDayShortLabels[day]}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-background"
                          onClick={() => setRecurrenceDays(weekdaysPreset)}
                          disabled={isSubmitting}
                        >
                          Weekdays
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-background"
                          onClick={() => setRecurrenceDays(weekendPreset)}
                          disabled={isSubmitting}
                        >
                          Weekend
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="endDate" className="text-xs text-muted-foreground">Until (optional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endRecurrenceDate}
                      onChange={(e) => setEndRecurrenceDate(e.target.value)}
                      className="bg-background"
                      placeholder="No end date"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
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
              disabled={
                !workoutId || !startDate || !startTime || isSubmitting ||
                (recurrence === 'weekly' && recurrenceDays.length === 0)
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? 'Saving...' : 'Scheduling...'}
                </>
              ) : (
                isEditing ? 'Save Changes' : 'Schedule'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleWorkoutModal;
