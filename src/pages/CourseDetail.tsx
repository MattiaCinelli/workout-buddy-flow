import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Play, RotateCcw, CheckCircle2, Pencil, Trash2, Calendar } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import CourseScheduleModal from '@/components/CourseScheduleModal';

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  
  const { 
    getCourseById, 
    getWorkoutById, 
    coursesLoading,
    getCourseProgress,
    getNextWorkoutInCourse,
    completeWorkoutInCourse,
    restartCourse,
    deleteCourse,
    startCourse
  } = useData();

  const course = id ? getCourseById(id) : undefined;
  const progress = course ? getCourseProgress(course.id) : 0;
  const isCompleted = progress === 100;
  const isStarted = !!course?.startedAt;
  const nextWorkout = course ? getNextWorkoutInCourse(course.id) : null;

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

  const handleStartCourse = async () => {
    await startCourse(course.id);
    toast.success('Course started!');
  };

  const handleCompleteWorkout = async (courseItemId: string, isRest: boolean) => {
    await completeWorkoutInCourse(course.id, courseItemId);
    toast.success(isRest ? 'Recovery day completed!' : 'Workout completed!');
  };

  const handleRestartCourse = async () => {
    await restartCourse(course.id);
    setRestartDialogOpen(false);
    toast.success('Course restarted!');
  };

  const handleDeleteCourse = async () => {
    await deleteCourse(course.id);
    toast.success('Course deleted');
    navigate('/courses');
  };

  const sortedWorkouts = [...course.workouts].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto py-6 px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/courses')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              {isCompleted && (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
            {course.description && (
              <p className="text-muted-foreground">{course.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {course.difficulty && <Badge variant="secondary" className="capitalize">{course.difficulty}</Badge>}
              {course.durationWeeks && <Badge variant="outline">{course.durationWeeks} {course.durationWeeks === 1 ? 'week' : 'weeks'}</Badge>}
              {course.goal && <Badge variant="outline">Goal: {course.goal}</Badge>}
            </div>
            {course.prerequisites && <p className="text-sm mt-2"><span className="font-medium">Prerequisites:</span> {course.prerequisites}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate(`/courses/${course.id}/edit`)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Course Progress</span>
              <span className="text-sm text-muted-foreground">
                {sortedWorkouts.filter(w => w.completed).length}/{sortedWorkouts.length} program days
              </span>
            </div>
            <Progress value={progress} className="h-3" />
            
            <div className="flex gap-2 mt-4">
              {!isStarted ? (
                <Button onClick={handleStartCourse} className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Start Course
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setRestartDialogOpen(true)}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restart Course
                </Button>
              )}
              <Button 
                variant="outline"
                onClick={() => setScheduleDialogOpen(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Add to Calendar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Workouts List */}
        <h2 className="text-lg font-semibold mb-4">Workouts</h2>
        <div className="space-y-3">
          {sortedWorkouts.map((courseWorkout, index) => {
            const workout = courseWorkout.workoutId ? getWorkoutById(courseWorkout.workoutId) : undefined;
            const isRest = courseWorkout.type === 'rest';
            const isNext = nextWorkout?.id === courseWorkout.id;
            const isLocked = !isStarted || (!courseWorkout.completed && !isNext);
            
            if (!workout && !isRest) return null;
            
            return (
              <Card 
                key={courseWorkout.id}
                className={`transition-all ${
                  courseWorkout.completed 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : isNext 
                      ? 'border-primary shadow-md' 
                      : 'opacity-60'
                }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      courseWorkout.completed 
                        ? 'bg-green-500 text-white' 
                        : isNext 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {courseWorkout.completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span className="font-bold">{index + 1}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{isRest ? (courseWorkout.title || 'Recovery day') : workout?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Week {courseWorkout.week} • Day {courseWorkout.day}{!isRest && workout ? ` • ${workout.duration} min • ${workout.sets.length} sets` : ' • Rest and recovery'}
                      </p>
                      {courseWorkout.instructions && <p className="text-sm mt-1">{courseWorkout.instructions}</p>}
                    </div>
                    
                    <div className="flex gap-2">
                      {courseWorkout.completed ? (
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          Done
                        </Badge>
                      ) : isNext && isStarted ? (
                        <>
                          {!isRest && <Button
                            size="sm" 
                            variant="outline"
                            onClick={() => workout && navigate(`/workout/${workout.id}`)}
                          >
                            View
                          </Button>}
                          <Button 
                            size="sm"
                            onClick={() => isRest
                              ? handleCompleteWorkout(courseWorkout.id, true)
                              : workout && navigate(`/workout/${workout.id}/start?courseId=${course.id}&courseItemId=${courseWorkout.id}`)}
                          >
                            {isRest ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                            {isRest ? 'Finish Rest Day' : 'Start'}
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          {isLocked ? 'Locked' : 'Pending'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>      <CourseScheduleModal course={course} open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen} />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{course.title}" and all progress. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteCourse}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restart Confirmation */}
      <AlertDialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all your progress in "{course.title}". All workouts will be marked as incomplete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartCourse}>
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CourseDetail;
