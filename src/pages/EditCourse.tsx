import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CourseWorkout } from '@/data/courses';
import CourseProgramBuilder from '@/components/CourseProgramBuilder';
import { toast } from 'sonner';
import { sortCourseItems } from '@/lib/courseSchedule';

const EditCourse = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { getCourseById, updateCourse, workouts, coursesLoading } = useData();
  
  const course = id ? getCourseById(id) : undefined;
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [prerequisites, setPrerequisites] = useState('');
  const [programItems, setProgramItems] = useState<CourseWorkout[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description || '');
      setGoal(course.goal || '');
      setDifficulty(course.difficulty || 'beginner');
      setPrerequisites(course.prerequisites || '');
      // Keep the order from the course
      const sorted = sortCourseItems(course.workouts);
      setProgramItems(sorted);
    }
  }, [course]);

  const handleSave = async () => {
    if (!course) return;
    
    if (!title.trim()) {
      toast.error('Please enter a course title');
      return;
    }
    const workoutSessions = programItems.filter(item => item.type === 'workout');
    if (workoutSessions.length === 0) {
      toast.error('Please add at least one workout session');
      return;
    }
    if (workoutSessions.some(item => !item.workoutId)) {
      toast.error('Every session needs a workout selected');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCourse(course.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        goal: goal.trim() || undefined,
        difficulty,
        prerequisites: prerequisites.trim() || undefined,
        durationWeeks: Math.max(...programItems.map(item => item.week), 1),
        workouts: programItems
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
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
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
      <Navbar />
      
      <main className="flex-1 container mx-auto py-6 px-4 md:px-6 max-w-3xl">
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Goal</Label><Input value={goal} onChange={e => setGoal(e.target.value)} /></div>
            <div className="space-y-2"><Label>Difficulty</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={difficulty} onChange={e => setDifficulty(e.target.value as typeof difficulty)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
          </div>
          <div className="space-y-2"><Label>Prerequisites</Label><Input value={prerequisites} onChange={e => setPrerequisites(e.target.value)} /></div>
          <CourseProgramBuilder items={programItems} workouts={workouts} onChange={setProgramItems} />

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
      </main>    </div>
  );
};

export default EditCourse;
