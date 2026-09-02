
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Exercise, getLogType } from '@/data/exercises';
import ExerciseItem from './ExerciseItem';
import { UnilateralSetNote } from './UnilateralSetNote';
import { useToast } from '@/hooks/use-toast';
import { Search, Minus, Plus, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { WorkoutSet, WorkoutEntry, WORKOUT_CATEGORIES, WORKOUT_CATEGORY_LABELS } from '@/data/workoutHistory';
import { useData } from '@/contexts/DataContext';
import { DEFAULT_REST_BETWEEN_SETS, DEFAULT_REST_BETWEEN_EXERCISES } from '@/lib/workoutRuntime';

interface CreateWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SelectedExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
}

const CreateWorkoutModal: React.FC<CreateWorkoutModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [restBetweenSets, setRestBetweenSets] = useState(DEFAULT_REST_BETWEEN_SETS);
  const [restBetweenExercises, setRestBetweenExercises] = useState(DEFAULT_REST_BETWEEN_EXERCISES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [activeTab, setActiveTab] = useState('exercises');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { exercises, createWorkout, muscleGroups } = useData();
  const muscleGroupName = (id: string) => muscleGroups.find(group => group.id === id)?.name ?? id;
  
  const filteredExercises = exercises.filter(exercise => 
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.muscleGroups.some(id =>
      muscleGroupName(id).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !category || selectedExercises.length === 0) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and add at least one exercise.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Flatten all sets from selected exercises
      const allSets: WorkoutSet[] = selectedExercises.flatMap(se => se.sets);
      
      // Calculate estimated duration (rough estimate: 2min per set + rest)
      const estimatedDuration = Math.ceil(allSets.length * 2.5);
      
      const workoutData: Omit<WorkoutEntry, 'id'> = {
        title,
        category: category as WorkoutEntry['category'],
        description: description.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
        duration: estimatedDuration,
        sets: allSets,
        restBetweenSets,
        restBetweenExercises,
        notes: notes.trim() || undefined
      };
      
      await createWorkout(workoutData);
      
      toast({
        title: "Workout created!",
        description: `"${title}" has been created with ${selectedExercises.length} exercises.`,
      });
      
      // Reset form and close modal
      setTitle('');
      setCategory('');
      setDescription('');
      setNotes('');
      setRestBetweenSets(DEFAULT_REST_BETWEEN_SETS);
      setRestBetweenExercises(DEFAULT_REST_BETWEEN_EXERCISES);
      setSearchQuery('');
      setSelectedExercises([]);
      setActiveTab('exercises');
      onClose();
    } catch (error) {
      console.error('Failed to create workout:', error);
      toast({
        title: "Error",
        description: "Failed to create workout. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSelectExercise = (exercise: Exercise) => {
    // Check if exercise is already selected
    if (selectedExercises.some(item => item.exercise.id === exercise.id)) {
      toast({
        title: "Already added",
        description: `${exercise.name} is already in your workout.`,
      });
      return;
    }
    
    // Pre-fill from the exercise's own defaults rather than a generic
    // category-based guess — e.g. a bodyweight exercise like "Wall Angel"
    // gets its own configured reps/sets instead of always defaulting to
    // 12 reps at 50kg regardless of what the exercise actually is.
    const isTimeBased = getLogType(exercise) === 'time';
    const setCount = exercise.defaultSets ?? 1;
    const defaultSets: WorkoutSet[] = Array.from({ length: setCount }, () => ({
      exerciseId: exercise.id,
      reps: isTimeBased ? undefined : (exercise.defaultReps ?? 12),
      weight: exercise.defaultWeight,
      duration: isTimeBased ? (exercise.defaultDuration ?? 30) : undefined,
      distance: exercise.defaultDistance,
      // Left undefined rather than baked in here — the runtime picks
      // between restBetweenSets/restBetweenExercises dynamically based on
      // whether the next set is this same exercise or a different one.
      // Pinning a value at creation time would freeze in whichever case
      // applied then, and stop tracking it if sets get reordered later.
    }));

    // Add exercise with default sets
    setSelectedExercises([
      ...selectedExercises, 
      { 
        exercise, 
        sets: defaultSets
      }
    ]);
    
    // Switch to selected tab
    setActiveTab('selected');
    
    toast({
      title: "Exercise added",
      description: `${exercise.name} added to workout.`,
    });
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter(item => item.exercise.id !== exerciseId));
    
    toast({
      title: "Exercise removed",
      description: "Exercise removed from workout.",
    });
  };

  const handleMoveExercise = (exerciseIndex: number, direction: -1 | 1) => {
    const target = exerciseIndex + direction;
    if (target < 0 || target >= selectedExercises.length) return;
    const updatedExercises = [...selectedExercises];
    [updatedExercises[exerciseIndex], updatedExercises[target]] = [updatedExercises[target], updatedExercises[exerciseIndex]];
    setSelectedExercises(updatedExercises);
  };

  const handleAddSet = (exerciseIndex: number) => {
    const updatedExercises = [...selectedExercises];
    const currentExercise = updatedExercises[exerciseIndex];
    const lastSet = currentExercise.sets[currentExercise.sets.length - 1];
    
    // Copy values from the last set as defaults for the new set
    const newSet: WorkoutSet = {
      exerciseId: currentExercise.exercise.id,
      reps: lastSet.reps,
      weight: lastSet.weight,
      duration: lastSet.duration,
      distance: lastSet.distance,
      // Same reasoning as handleSelectExercise — left undefined so the
      // runtime's dynamic same/different-exercise default applies.
    };

    updatedExercises[exerciseIndex].sets.push(newSet);
    setSelectedExercises(updatedExercises);
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...selectedExercises];
    
    // Don't remove if it's the last set
    if (updatedExercises[exerciseIndex].sets.length <= 1) {
      toast({
        title: "Cannot remove set",
        description: "Each exercise must have at least one set.",
      });
      return;
    }
    
    updatedExercises[exerciseIndex].sets.splice(setIndex, 1);
    setSelectedExercises(updatedExercises);
  };

  const updateSetValue = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof WorkoutSet,
    value: number | undefined
  ) => {
    const updatedExercises = [...selectedExercises];
    updatedExercises[exerciseIndex].sets[setIndex] = {
      ...updatedExercises[exerciseIndex].sets[setIndex],
      [field]: value
    };
    setSelectedExercises(updatedExercises);
  };

  const patchSet = (exerciseIndex: number, setIndex: number, patch: Partial<WorkoutSet>) => {
    const updatedExercises = [...selectedExercises];
    updatedExercises[exerciseIndex].sets[setIndex] = {
      ...updatedExercises[exerciseIndex].sets[setIndex],
      ...patch,
    };
    setSelectedExercises(updatedExercises);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setCategory('');
      setDescription('');
      setNotes('');
      setRestBetweenSets(DEFAULT_REST_BETWEEN_SETS);
      setRestBetweenExercises(DEFAULT_REST_BETWEEN_EXERCISES);
      setSearchQuery('');
      setSelectedExercises([]);
      setActiveTab('exercises');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Workout</DialogTitle>
          <DialogDescription>
            Design your perfect workout routine. Add exercises, sets, and reps to track your progress.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workout-title" className="text-right">
                Title
              </Label>
              <Input
                id="workout-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="Leg Day"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workout-category" className="text-right">
                Category
              </Label>
              <Select 
                value={category}
                onValueChange={setCategory}
                disabled={isSubmitting}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select workout type" />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_CATEGORIES.map(value => (
                    <SelectItem key={value} value={value}>{WORKOUT_CATEGORY_LABELS[value]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workout-rest-sets" className="text-right">
                Rest Between Sets
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="workout-rest-sets"
                  type="number"
                  min="0"
                  max="3600"
                  className="w-24"
                  value={restBetweenSets}
                  onChange={(e) => setRestBetweenSets(e.target.value ? Number(e.target.value) : 0)}
                  disabled={isSubmitting}
                />
                <span className="text-sm text-muted-foreground">seconds — between sets of the same exercise</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workout-rest-exercises" className="text-right">
                Rest Between Exercises
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="workout-rest-exercises"
                  type="number"
                  min="0"
                  max="3600"
                  className="w-24"
                  value={restBetweenExercises}
                  onChange={(e) => setRestBetweenExercises(e.target.value ? Number(e.target.value) : 0)}
                  disabled={isSubmitting}
                />
                <span className="text-sm text-muted-foreground">seconds — when moving to a different exercise</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="workout-description" className="text-right pt-2">
                Description
              </Label>
              <textarea
                id="workout-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="What this workout is, or who it's for — shown in your workout list"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="workout-notes" className="text-right pt-2">
                Notes
              </Label>
              <textarea
                id="workout-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="How are you feeling? Any goals for this workout?"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="mt-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="exercises" disabled={isSubmitting}>Exercise Library</TabsTrigger>
                  <TabsTrigger value="selected" disabled={isSubmitting}>
                    Selected Exercises ({selectedExercises.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="exercises" className="mt-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search exercises..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {filteredExercises.map((exercise) => (
                      <ExerciseItem
                        key={exercise.id}
                        exercise={exercise}
                        onSelect={handleSelectExercise}
                      />
                    ))}
                    {filteredExercises.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No exercises found matching your search
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="selected">
                  {selectedExercises.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No exercises selected yet.
                      <br />
                      Start by adding exercises from the Exercise Library.
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[300px] overflow-y-auto py-2">
                      {selectedExercises.map((selectedEx, exIndex) => (
                        <div key={selectedEx.exercise.id} className="border rounded-md p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-1">
                              <div className="flex flex-col -my-1">
                                <Button
                                  variant="ghost" size="icon" type="button" className="h-5 w-6"
                                  onClick={() => handleMoveExercise(exIndex, -1)}
                                  disabled={isSubmitting || exIndex === 0}
                                  aria-label="Move exercise up"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" type="button" className="h-5 w-6"
                                  onClick={() => handleMoveExercise(exIndex, 1)}
                                  disabled={isSubmitting || exIndex === selectedExercises.length - 1}
                                  aria-label="Move exercise down"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div>
                                <h3 className="font-medium text-base">{selectedEx.exercise.name}</h3>
                                {selectedEx.exercise.unilateral && <UnilateralSetNote />}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => handleRemoveExercise(selectedEx.exercise.id)}
                              className="h-8 px-2"
                              disabled={isSubmitting}
                            >
                              Remove
                            </Button>
                          </div>
                          
                          <div className="space-y-3 mt-3">
                            {selectedEx.sets.map((set, setIndex) => (
                              <div key={setIndex} className={`flex flex-wrap items-center gap-2 p-2 rounded-md ${set.warmup ? 'bg-amber-400/10 border border-amber-400/30' : 'bg-muted/40'}`}>
                                <div className="font-medium min-w-[80px]">
                                  Set {setIndex + 1}
                                  {selectedEx.exercise.unilateral && (
                                    <span className="ml-1 text-xs font-normal text-muted-foreground">L + R</span>
                                  )}
                                </div>

                                <Button
                                  type="button" size="sm" className="h-7 px-2 text-xs"
                                  variant={set.warmup ? 'default' : 'outline'} aria-pressed={!!set.warmup}
                                  onClick={() => patchSet(exIndex, setIndex, { warmup: set.warmup ? undefined : true })}
                                  disabled={isSubmitting}
                                >
                                  Warm-up
                                </Button>
                                {getLogType(selectedEx.exercise) === 'reps' && (
                                  <Button
                                    type="button" size="sm" className="h-7 px-2 text-xs"
                                    variant={set.amrap ? 'default' : 'outline'} aria-pressed={!!set.amrap}
                                    onClick={() => patchSet(exIndex, setIndex, { amrap: set.amrap ? undefined : true })}
                                    disabled={isSubmitting}
                                  >
                                    AMRAP
                                  </Button>
                                )}

                                {getLogType(selectedEx.exercise) === 'reps' ? (
                                  <div className="flex items-center">
                                    <Label htmlFor={`reps-${exIndex}-${setIndex}`} className="mr-2 text-xs">
                                      Reps:
                                    </Label>
                                    <Input
                                      id={`reps-${exIndex}-${setIndex}`}
                                      type="number"
                                      min="1"
                                      max="1000"
                                      className="h-8 w-16"
                                      value={set.reps || ''}
                                      onChange={(e) => updateSetValue(
                                        exIndex,
                                        setIndex,
                                        'reps',
                                        e.target.value ? Number(e.target.value) : undefined
                                      )}
                                      disabled={isSubmitting}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <Label htmlFor={`duration-${exIndex}-${setIndex}`} className="mr-2 text-xs">
                                      Duration (sec):
                                    </Label>
                                    <Input
                                      id={`duration-${exIndex}-${setIndex}`}
                                      type="number"
                                      min="1"
                                      max="86400"
                                      className="h-8 w-16"
                                      value={set.duration || ''}
                                      onChange={(e) => updateSetValue(
                                        exIndex,
                                        setIndex,
                                        'duration',
                                        e.target.value ? Number(e.target.value) : undefined
                                      )}
                                      disabled={isSubmitting}
                                    />
                                  </div>
                                )}

                                <div className="flex items-center">
                                  <Label htmlFor={`weight-${exIndex}-${setIndex}`} className="mr-2 text-xs">
                                    Weight (kg, optional):
                                  </Label>
                                  <Input
                                    id={`weight-${exIndex}-${setIndex}`}
                                    type="number"
                                    min="0"
                                    max="1000"
                                    step="0.5"
                                    className="h-8 w-16"
                                    value={set.weight || ''}
                                    onChange={(e) => updateSetValue(
                                      exIndex,
                                      setIndex,
                                      'weight',
                                      e.target.value ? Number(e.target.value) : undefined
                                    )}
                                    disabled={isSubmitting}
                                  />
                                </div>

                                <div className="flex items-center">
                                  <Label htmlFor={`distance-${exIndex}-${setIndex}`} className="mr-2 text-xs">
                                    Distance (m, optional):
                                  </Label>
                                  <Input
                                    id={`distance-${exIndex}-${setIndex}`}
                                    type="number"
                                    min="0"
                                    max="1000000"
                                    step="100"
                                    className="h-8 w-20"
                                    value={set.distance || ''}
                                    onChange={(e) => updateSetValue(
                                      exIndex,
                                      setIndex,
                                      'distance',
                                      e.target.value ? Number(e.target.value) : undefined
                                    )}
                                    disabled={isSubmitting}
                                  />
                                </div>

                                <div className="flex items-center">
                                  <Label htmlFor={`rest-${exIndex}-${setIndex}`} className="mr-2 text-xs">Rest (sec):</Label>
                                  <Input
                                    id={`rest-${exIndex}-${setIndex}`}
                                    type="number"
                                    min="0"
                                    max="3600"
                                    className="h-8 w-20"
                                    // This set's own rest comes next in the sequence — if it's not
                                    // the last set of this exercise, the following set is another
                                    // set of the SAME exercise (restBetweenSets); otherwise it's
                                    // whatever exercise comes next (restBetweenExercises).
                                    value={set.restAfter ?? (setIndex < selectedEx.sets.length - 1 ? restBetweenSets : restBetweenExercises)}
                                    onChange={(e) => updateSetValue(
                                      exIndex,
                                      setIndex,
                                      'restAfter',
                                      e.target.value ? Number(e.target.value) : undefined
                                    )}
                                    disabled={isSubmitting}
                                  />
                                </div>
                                
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 ml-auto"
                                  onClick={() => handleRemoveSet(exIndex, setIndex)}
                                  disabled={isSubmitting}
                                  aria-label={`Remove set ${setIndex + 1} from ${selectedEx.exercise.name}`}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full flex items-center justify-center gap-1 mt-2"
                              onClick={() => handleAddSet(exIndex)}
                              disabled={isSubmitting}
                            >
                              <Plus className="h-4 w-4" /> Add Set{selectedEx.exercise.unilateral ? ' (both sides)' : ''}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-workout-blue hover:bg-blue-600"
              disabled={!title || !category || selectedExercises.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Workout'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkoutModal;
