
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Play, Pause, SkipForward, Timer, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WorkoutSet } from '@/data/workoutHistory';
import { useData } from '@/contexts/DataContext';

type WorkoutStep = {
  type: 'exercise' | 'rest';
  exerciseId?: string;
  setIndex?: number;
  duration?: number;
  reps?: number;
  weight?: number;
  distance?: number;
};

const WorkoutPresentation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const { workouts, exercises, workoutsLoading, createSession, completeWorkoutInCourse } = useData();
  const startedAt = useRef(Date.now());
  const completionSaved = useRef(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [workoutSteps, setWorkoutSteps] = useState<WorkoutStep[]>([]);
  const [workoutProgress, setWorkoutProgress] = useState(0);
  
  // Find the workout by ID
  const workout = workouts.find(w => w.id === id);
  
  useEffect(() => {
    if (!workoutsLoading && !workout) {
      toast({
        title: "Workout not found",
        description: "The workout you're trying to start doesn't exist.",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [workout, workoutsLoading, navigate, toast]);

  const initializeStep = useCallback((index: number, steps: WorkoutStep[]) => {
    if (index >= steps.length) return;
    const step = steps[index];
    setTimeLeft(step.duration || 0);
  }, []);

  const handleWorkoutComplete = useCallback(async () => {
    if (!workout || completionSaved.current) return;
    completionSaved.current = true;
    const completedAt = new Date().toISOString();
    const courseId = searchParams.get('courseId') || undefined;
    const courseItemId = searchParams.get('courseItemId') || undefined;
    await createSession({
      workoutId: workout.id,
      completedAt,
      date: completedAt,
      title: workout.title,
      duration: Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)),
      plannedDuration: workout.duration,
      category: workout.category,
      sets: workout.sets,
      notes: workout.notes,
      courseId,
      courseItemId,
      scheduledWorkoutId: searchParams.get('scheduledWorkoutId') || undefined,
    });
    if (courseId && courseItemId) await completeWorkoutInCourse(courseId, courseItemId);
    toast({ title: "Workout Complete!", description: "Great job! You've finished your workout." });
    navigate(courseId ? `/courses/${courseId}` : `/workout/${id}`);
  }, [workout, searchParams, createSession, completeWorkoutInCourse, toast, navigate, id]);

  const handleNextStep = useCallback(() => {
    const nextStepIndex = activeStep + 1;
    if (nextStepIndex >= workoutSteps.length) {
      void handleWorkoutComplete();
      return;
    }
    setActiveStep(nextStepIndex);
    initializeStep(nextStepIndex, workoutSteps);
  }, [activeStep, workoutSteps, initializeStep, handleWorkoutComplete]);

  // Prepare workout steps on component mount
  useEffect(() => {
    if (!workout) return;
    
    const steps: WorkoutStep[] = [];
    
    // Preserve the authored flat order so circuits and supersets remain interleaved.
    workout.sets.forEach((set, setIndex) => {
        // Add exercise step
        steps.push({
          type: 'exercise',
          exerciseId: set.exerciseId,
          setIndex: workout.sets.slice(0, setIndex + 1).filter(candidate => candidate.exerciseId === set.exerciseId).length - 1,
          reps: set.reps,
          weight: set.weight,
          duration: set.duration,
          distance: set.distance
        });
        
        // Add rest step after all sets except the last set of the last exercise
        const nextSet = workout.sets[setIndex + 1];
        if (nextSet) {
          steps.push({
            type: 'rest',
            duration: set.restAfter ?? (nextSet.exerciseId === set.exerciseId ? 60 : (workout.restBetweenExercises ?? 90))
          });
        }
    });
    
    setWorkoutSteps(steps);
    initializeStep(0, steps);
  }, [workout, initializeStep]);
  
  // Calculate total workout progress
  useEffect(() => {
    if (workoutSteps.length === 0) return;
    const progress = (activeStep / workoutSteps.length) * 100;
    setWorkoutProgress(progress);
  }, [activeStep, workoutSteps]);
  
  // Timer logic
  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleNextStep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, isPaused, handleNextStep]);
  
  // Handle play/pause toggle
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };
  
  // Handle exiting the workout
  const handleExit = () => {
    navigate(`/workout/${id}`);
  };
  
  // Get current step details
  const currentStep = workoutSteps[activeStep];

  if (!workout) return null;
  
  if (!currentStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading workout...</h1>
        </div>
      </div>
    );
  }
  
  // Get exercise details if current step is an exercise
  const exercise = currentStep.exerciseId 
    ? exercises.find(ex => ex.id === currentStep.exerciseId)
    : null;
  
  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white" 
          onClick={handleExit}
        >
          <X className="h-6 w-6" />
        </Button>
        
        <div className="text-center flex-1">
          <h1 className="text-xl font-bold">{workout.title}</h1>
        </div>
        
        <div className="w-6"></div> {/* Empty div for balance */}
      </header>
      
      {/* Progress bar */}
      <div className="px-4">
        <Progress value={workoutProgress} className="h-2" />
      </div>
      
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {currentStep.type === 'exercise' && exercise ? (
          <>
            {/* Exercise Image */}
            {exercise.imageUrl && (
              <div className="mb-6 max-w-xs mx-auto">
                <img 
                  src={exercise.imageUrl} 
                  alt={exercise.name}
                  className="w-full h-48 object-contain rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">{exercise.name}</h2>
              <p className="text-xl text-gray-400 mb-1">Set {(currentStep.setIndex || 0) + 1}</p>
              
              {/* Show appropriate metrics based on exercise type */}
              {exercise.category === 'strength' && currentStep.reps && (
                <div className="flex items-center justify-center gap-2 my-4">
                  <span className="text-5xl font-bold">{currentStep.reps}</span>
                  <span className="text-2xl">reps</span>
                  
                  {currentStep.weight && (
                    <>
                      <span className="text-2xl mx-2">at</span>
                      <span className="text-5xl font-bold">{currentStep.weight}</span>
                      <span className="text-2xl">lbs</span>
                    </>
                  )}
                </div>
              )}
              
              {(exercise.category === 'cardio' || exercise.category === 'flexibility') && currentStep.duration && (
                <div className="flex items-center justify-center gap-2 my-4">
                  <Timer className="h-8 w-8" />
                  <span className="text-5xl font-bold">{formatTime(currentStep.duration)}</span>
                  
                  {currentStep.distance && (
                    <>
                      <span className="text-2xl mx-2">for</span>
                      <span className="text-5xl font-bold">{currentStep.distance}</span>
                      <span className="text-2xl">m</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <Button 
              size="lg" 
              className="bg-workout-green hover:bg-green-600 text-white px-8 py-6 rounded-full text-xl"
              onClick={handleNextStep}
            >
              <SkipForward className="h-6 w-6 mr-2" />
              <span>Next</span>
            </Button>
          </>
        ) : (
          // Rest period
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-6">Rest</h2>
              <div className="text-7xl font-bold mb-8">{formatTime(timeLeft)}</div>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-workout-purple hover:bg-purple-600 text-white px-6 py-5 rounded-full text-xl"
                onClick={togglePause}
              >
                {isPaused ? (
                  <>
                    <Play className="h-6 w-6 mr-2" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-6 w-6 mr-2" />
                    <span>Pause</span>
                  </>
                )}
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                className="border-white text-white px-6 py-5 rounded-full text-xl"
                onClick={handleNextStep}
              >
                <span>Skip</span>
                <SkipForward className="h-6 w-6 ml-2" />
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default WorkoutPresentation;
