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
import { useData } from '@/contexts/DataContext';
import { CourseWorkout } from '@/data/courses';
import CourseProgramBuilder from './CourseProgramBuilder';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ isOpen, onClose }) => {
  const { workouts, createCourse } = useData();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [prerequisites, setPrerequisites] = useState('');
  const [courseWorkouts, setCourseWorkouts] = useState<CourseWorkout[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a course title');
      return;
    }
    if (!courseWorkouts.some(item => item.type === 'workout' && item.workoutId)) {
      toast.error('Please add at least one workout session');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCourse({
        title: title.trim(),
        description: description.trim() || undefined,
        goal: goal.trim() || undefined,
        difficulty,
        prerequisites: prerequisites.trim() || undefined,
        durationWeeks: Math.max(...courseWorkouts.map(item => item.week), 1),
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
    setGoal('');
    setDifficulty('beginner');
    setPrerequisites('');
    setCourseWorkouts([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="course-goal">Goal</Label><Input id="course-goal" placeholder="Build strength" value={goal} onChange={e => setGoal(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="course-difficulty">Difficulty</Label><select id="course-difficulty" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={difficulty} onChange={e => setDifficulty(e.target.value as typeof difficulty)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
          </div>
          <div className="space-y-2"><Label>Prerequisites (optional)</Label><Input placeholder="Equipment, experience or health requirements" value={prerequisites} onChange={e => setPrerequisites(e.target.value)} /></div>
          <CourseProgramBuilder items={courseWorkouts} workouts={workouts} onChange={setCourseWorkouts} />
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
