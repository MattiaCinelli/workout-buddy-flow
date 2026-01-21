import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Save, GripVertical, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import CreateWorkoutModal from '@/components/CreateWorkoutModal';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { CourseWorkout } from '@/data/courses';
import { toast } from 'sonner';

const EditCourse = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [createWorkoutOpen, setCreateWorkoutOpen] = useState(false);
  
  const { getCourseById, updateCourse, workouts, coursesLoading, getWorkoutById } = useData();
  
  const course = id ? getCourseById(id) : undefined;
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description || '');
      // Keep the order from the course
      const sorted = [...course.workouts].sort((a, b) => a.order - b.order);
      setSelectedWorkouts(sorted.map(w => w.workoutId));
    }
  }, [course]);

  const handleToggleWorkout = (workoutId: string) => {
    setSelectedWorkouts(prev => 
      prev.includes(workoutId)
        ? prev.filter(id => id !== workoutId)
        : [...prev, workoutId]
    );
  };

  const handleSave = async () => {
    if (!course) return;
    
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
      // Preserve completion status for existing workouts
      const existingCompletions = new Map<string, { completed: boolean; completedAt?: string }>(
        course.workouts.map(w => [w.workoutId, { completed: w.completed, completedAt: w.completedAt }])
      );

      const courseWorkouts: CourseWorkout[] = selectedWorkouts.map((workoutId, index) => {
        const existing = existingCompletions.get(workoutId);
        return {
          workoutId,
          order: index + 1,
          completed: existing?.completed || false,
          completedAt: existing?.completedAt
        };
      });

      await updateCourse(course.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        workouts: courseWorkouts
      });

      toast.success('Course updated successfully!');
      navigate(`/courses/${course.id}`);
    } catch (error) {
      console.error('Failed to update course:', error);
      toast.error('Failed to update course');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (coursesLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar onOpenCreateWorkout={() => setCreateWorkoutOpen(true)} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar onOpenCreateWorkout={() => setCreateWorkoutOpen(true)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Course not found</h2>
            <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar onOpenCreateWorkout={() => setCreateWorkoutOpen(true)} />
      
      <main className="flex-1 container mx-auto py-6 px-4 md:px-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/courses/${course.id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Course</h1>
        </div>

        <div className="space-y-6">
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
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Workouts ({selectedWorkouts.length} selected)</Label>
            <p className="text-sm text-muted-foreground">
              Click to select workouts. Order is based on selection order.
            </p>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {workouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No workouts available. Create some workouts first.
                </p>
              ) : (
                <div className="space-y-2">
                  {workouts.map((workout) => {
                    const orderIndex = selectedWorkouts.indexOf(workout.id);
                    const isSelected = orderIndex !== -1;
                    
                    return (
                      <div
                        key={workout.id}
                        className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => handleToggleWorkout(workout.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleWorkout(workout.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{workout.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {workout.category} • {workout.duration} min • {workout.sets.length} sets
                          </p>
                        </div>
                        {isSelected && (
                          <span className="text-sm font-medium text-primary">
                            #{orderIndex + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/courses/${course.id}`)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSubmitting}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </main>
      
      <CreateWorkoutModal 
        isOpen={createWorkoutOpen}
        onClose={() => setCreateWorkoutOpen(false)}
      />
    </div>
  );
};

export default EditCourse;
