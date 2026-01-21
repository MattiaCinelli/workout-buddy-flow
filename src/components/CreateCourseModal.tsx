import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useData } from '@/contexts/DataContext';
import { CourseWorkout } from '@/data/courses';
import { GripVertical, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ isOpen, onClose }) => {
  const { workouts, createCourse } = useData();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleWorkout = (workoutId: string) => {
    setSelectedWorkouts(prev => 
      prev.includes(workoutId)
        ? prev.filter(id => id !== workoutId)
        : [...prev, workoutId]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a course title');
      return;
    }
    if (selectedWorkouts.length === 0) {
      toast.error('Please select at least one workout');
      return;
    }

    setIsSubmitting(true);
    try {
      const courseWorkouts: CourseWorkout[] = selectedWorkouts.map((workoutId, index) => ({
        workoutId,
        order: index + 1,
        completed: false
      }));

      await createCourse({
        title: title.trim(),
        description: description.trim() || undefined,
        workouts: courseWorkouts
      });

      toast.success('Course created successfully!');
      handleClose();
    } catch (error) {
      console.error('Failed to create course:', error);
      toast.error('Failed to create course');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setSelectedWorkouts([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>
            Build a course by selecting workouts in the order you want to complete them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="title">Course Title</Label>
            <Input
              id="title"
              placeholder="e.g., 4-Week Strength Program"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe your course..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Workouts ({selectedWorkouts.length} selected)</Label>
            <ScrollArea className="h-[200px] border rounded-md p-2">
              {workouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No workouts available. Create some workouts first.
                </p>
              ) : (
                <div className="space-y-2">
                  {workouts.map((workout) => (
                    <div
                      key={workout.id}
                      className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-colors ${
                        selectedWorkouts.includes(workout.id)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => handleToggleWorkout(workout.id)}
                    >
                      <Checkbox
                        checked={selectedWorkouts.includes(workout.id)}
                        onCheckedChange={() => handleToggleWorkout(workout.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{workout.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {workout.category} • {workout.duration} min • {workout.sets.length} sets
                        </p>
                      </div>
                      {selectedWorkouts.includes(workout.id) && (
                        <span className="text-xs text-muted-foreground">
                          #{selectedWorkouts.indexOf(workout.id) + 1}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Plus className="h-4 w-4 mr-1" />
            Create Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCourseModal;
