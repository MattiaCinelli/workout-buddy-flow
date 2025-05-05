
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Play, Pause, SkipForward, Timer, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { workoutHistory, WorkoutSet } from '@/data/workoutHistory';
import { exerciseList } from '@/data/exercises';

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
  const { toast } = useToast();
  
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [workoutSteps, setWorkoutSteps] = useState<WorkoutStep[]>([]);
  const [workoutProgress, setWorkoutProgress] = useState(0);
  
  // Find the workout by ID
  const workout = workoutHistory.find(w => w.id === id);
  
  // If workout not found, redirect to details page
  if (!workout) {
    useEffect(() => {
      toast({
        title: "Workout not found",
        description: "The workout you're trying to start doesn't exist.",
        variant: "destructive"
      });
      navigate('/');
    }, []);
    
    return null;
  }

  // Prepare workout steps on component mount
  useEffect(() => {
    if (!workout) return;
    
    const steps: WorkoutStep[] = [];
    
    // Group sets by exercise
    const exerciseSets: Record<string, WorkoutSet[]> = {};
    workout.sets.forEach(set => {
      if (!exerciseSets[set.exerciseId]) {
        exerciseSets[set.exerciseId] = [];
      }
      exerciseSets[set.exerciseId].push(set);
    });
    
    // Convert to workout steps (exercise followed by rest)
    Object.entries(exerciseSets).forEach(([exerciseId, sets], exerciseIndex) => {
      sets.forEach((set, setIndex) => {
        // Add exercise step
        steps.push({
          type: 'exercise',
          exerciseId: set.exerciseId,
          setIndex,
          reps: set.reps,
          weight: set.weight,
          duration: set.duration,
          distance: set.distance
        });
        
        // Add rest step after all sets except the last set of the last exercise
        const isLastSet = setIndex === sets.length - 1;
        const isLastExercise = exerciseIndex === Object.keys(exerciseSets).length - 1;
        
        if (!isLastSet) {
          // Rest between sets (default to 60 seconds if not specified)
          steps.push({
            type: 'rest',
            duration: set.restAfter || 60
          });
        } else if (!isLastExercise) {
          // Rest between exercises (default to 90 seconds if not specified)
          steps.push({
            type: 'rest',
            duration: workout.restBetweenExercises || 90
          });
        }
      });
    });
    
    setWorkoutSteps(steps);
    initializeStep(0, steps);
  }, [workout]);
  
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
  }, [timeLeft, isPaused]);
  
  // Initialize the current step
  const initializeStep = useCallback((index: number, steps: WorkoutStep[]) => {
    if (index >= steps.length) {
      // Workout complete
      return;
    }
    
    const step = steps[index];
    
    if (step.type === 'rest' && step.duration) {
      setTimeLeft(step.duration);
    } else {
      // For exercise steps, no timer unless it's a timed exercise
      setTimeLeft(step.duration || 0);
    }
  }, []);
  
  // Handle proceeding to the next step
  const handleNextStep = useCallback(() => {
    const nextStepIndex = activeStep + 1;
    
    if (nextStepIndex >= workoutSteps.length) {
      // Workout complete
      handleWorkoutComplete();
      return;
    }
    
    setActiveStep(nextStepIndex);
    initializeStep(nextStepIndex, workoutSteps);
  }, [activeStep, workoutSteps, initializeStep]);
  
  // Handle workout completion
  const handleWorkoutComplete = () => {
    toast({
      title: "Workout Complete!",
      description: "Great job! You've finished your workout.",
    });
    
    navigate(`/workout/${id}`);
  };
  
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
    ? exerciseList.find(ex => ex.id === currentStep.exerciseId)
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
