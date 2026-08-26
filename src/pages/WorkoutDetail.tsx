import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Play, Search, Minus, Plus, ChevronUp, ChevronDown, Trash2, Loader2 } from 'lucide-react';
import { Exercise, getLogType } from '@/data/exercises';
import { WorkoutSet, WorkoutEntry } from '@/data/workoutHistory';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import ExerciseItem from '@/components/ExerciseItem';

interface SelectedExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
}

// Deliberately not a separate read-only view + Edit modal: clicking into a
// workout should land you directly on the same editable form, so tweaking
// a set's reps doesn't require an extra "Edit" click first.
const WorkoutDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workouts, exercises, workoutsLoading, updateWorkout, deleteWorkout, muscleGroups } = useData();
  const { toast } = useToast();
  const workout = workouts.find(w => w.id === id);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [activeTab, setActiveTab] = useState('selected');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadedWorkoutId, setLoadedWorkoutId] = useState<string | null>(null);

  const muscleGroupName = (groupId: string) => muscleGroups.find(group => group.id === groupId)?.name ?? groupId;

  // Loads the workout's current data into the form once (not on every
  // `workouts` update) — otherwise a background sync mid-edit would
  // silently overwrite whatever the user is in the middle of typing.
  useEffect(() => {
    if (!workout || loadedWorkoutId === workout.id) return;
    setTitle(workout.title);
    setCategory(workout.category);
    setDescription(workout.description || '');
    setNotes(workout.notes || '');

    const exerciseMap = new Map<string, WorkoutSet[]>();
    workout.sets.forEach(set => {
      if (!exerciseMap.has(set.exerciseId)) exerciseMap.set(set.exerciseId, []);
      exerciseMap.get(set.exerciseId)!.push(set);
    });
    const selected: SelectedExercise[] = [];
    exerciseMap.forEach((sets, exerciseId) => {
      const exercise = exercises.find(ex => ex.id === exerciseId);
      if (exercise) selected.push({ exercise, sets });
    });
    setSelectedExercises(selected);
    setLoadedWorkoutId(workout.id);
  }, [workout, exercises, loadedWorkoutId]);

  if (workoutsLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading workout...</p>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Workout not found</h1>
        <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
      </div>
    );
  }

  const filteredExercises = exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.muscleGroups.some(groupId =>
      muscleGroupName(groupId).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || selectedExercises.length === 0) {
      toast({ title: 'Missing information', description: 'Please fill in all required fields and add at least one exercise.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const allSets: WorkoutSet[] = selectedExercises.flatMap(se => se.sets);
      const estimatedDuration = Math.ceil(allSets.length * 2.5);
      await updateWorkout(workout.id, {
        title,
        category: category as WorkoutEntry['category'],
        description: description.trim() || undefined,
        duration: estimatedDuration,
        sets: allSets,
        notes: notes.trim() || undefined,
      });
      toast({ title: 'Workout updated!', description: `"${title}" has been saved.` });
    } catch (error) {
      console.error('Failed to update workout:', error);
      toast({ title: 'Error', description: 'Failed to update workout. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectExercise = (exercise: Exercise) => {
    if (selectedExercises.some(item => item.exercise.id === exercise.id)) {
      toast({ title: 'Already added', description: `${exercise.name} is already in your workout.` });
      return;
    }
    const isTimeBased = getLogType(exercise) === 'time';
    const setCount = exercise.defaultSets ?? 1;
    const defaultSets: WorkoutSet[] = Array.from({ length: setCount }, () => ({
      exerciseId: exercise.id,
      reps: isTimeBased ? undefined : (exercise.defaultReps ?? 12),
      weight: exercise.defaultWeight,
      duration: isTimeBased ? (exercise.defaultDuration ?? 30) : undefined,
      distance: exercise.defaultDistance,
      restAfter: 30,
    }));
    setSelectedExercises([...selectedExercises, { exercise, sets: defaultSets }]);
    setActiveTab('selected');
    toast({ title: 'Exercise added', description: `${exercise.name} added to workout.` });
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter(item => item.exercise.id !== exerciseId));
    toast({ title: 'Exercise removed', description: 'Exercise removed from workout.' });
  };

  const handleMoveExercise = (exerciseIndex: number, direction: -1 | 1) => {
    const target = exerciseIndex + direction;
    if (target < 0 || target >= selectedExercises.length) return;
    const updated = [...selectedExercises];
    [updated[exerciseIndex], updated[target]] = [updated[target], updated[exerciseIndex]];
    setSelectedExercises(updated);
  };

  const handleAddSet = (exerciseIndex: number) => {
    const updated = [...selectedExercises];
    const current = updated[exerciseIndex];
    const lastSet = current.sets[current.sets.length - 1];
    updated[exerciseIndex].sets.push({
      exerciseId: current.exercise.id,
      reps: lastSet.reps, weight: lastSet.weight, duration: lastSet.duration, distance: lastSet.distance,
      restAfter: 30,
    });
    setSelectedExercises(updated);
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...selectedExercises];
    if (updated[exerciseIndex].sets.length <= 1) {
      toast({ title: 'Cannot remove set', description: 'Each exercise must have at least one set.' });
      return;
    }
    updated[exerciseIndex].sets.splice(setIndex, 1);
    setSelectedExercises(updated);
  };

  const updateSetValue = (exerciseIndex: number, setIndex: number, field: keyof WorkoutSet, value: number | undefined) => {
    const updated = [...selectedExercises];
    updated[exerciseIndex].sets[setIndex] = { ...updated[exerciseIndex].sets[setIndex], [field]: value };
    setSelectedExercises(updated);
  };

  const handleDeleteWorkout = async () => {
    setIsDeleting(true);
    try {
      await deleteWorkout(workout.id);
      toast({ title: 'Workout deleted', description: `"${workout.title}" has been deleted.` });
      navigate('/workouts');
    } catch (error) {
      console.error('Failed to delete workout:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete workout. Please try again.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto py-6 px-4 md:px-6 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => navigate('/workouts')}>
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <Button
            size="sm"
            className="ml-auto bg-workout-green hover:bg-green-600 text-white flex items-center gap-1"
            onClick={() => navigate(`/workouts/${id}/session`)}
          >
            <Play className="h-4 w-4" />
            <span>Start Workout</span>
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workout-title" className="text-right">Title</Label>
              <Input
                id="workout-title" value={title} onChange={e => setTitle(e.target.value)}
                className="col-span-3 text-lg font-bold h-auto py-2" placeholder="Leg Day" required disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workout-category" className="text-right">Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select workout type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="flexibility">Flexibility</SelectItem>
                  <SelectItem value="balance">Balance</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="workout-description" className="text-right pt-2">Description</Label>
              <textarea
                id="workout-description" value={description} onChange={e => setDescription(e.target.value)}
                className="col-span-3 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="What this workout is, or who it's for — shown in your workout list"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="workout-notes" className="text-right pt-2">Notes</Label>
              <textarea
                id="workout-notes" value={notes} onChange={e => setNotes(e.target.value)}
                className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="How are you feeling? Any goals for this workout?"
                disabled={isSubmitting}
              />
            </div>

            <div className="mt-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="selected" disabled={isSubmitting}>
                    Selected Exercises ({selectedExercises.length})
                  </TabsTrigger>
                  <TabsTrigger value="exercises" disabled={isSubmitting}>Exercise Library</TabsTrigger>
                </TabsList>

                <TabsContent value="exercises" className="mt-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search exercises..." className="pl-8"
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)} disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {filteredExercises.map(exercise => (
                      <ExerciseItem key={exercise.id} exercise={exercise} onSelect={handleSelectExercise} />
                    ))}
                    {filteredExercises.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">No exercises found matching your search</div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="selected">
                  {selectedExercises.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No exercises selected yet.
                      <br />
                      Add exercises from the Exercise Library tab.
                    </div>
                  ) : (
                    <div className="space-y-6 py-2">
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
                                {selectedEx.exercise.instructions && (
                                  <p className="text-xs text-muted-foreground max-w-md">{selectedEx.exercise.instructions}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline" size="sm" type="button"
                              onClick={() => handleRemoveExercise(selectedEx.exercise.id)}
                              className="h-8 px-2" disabled={isSubmitting}
                            >
                              Remove
                            </Button>
                          </div>

                          <div className="space-y-3 mt-3">
                            {selectedEx.sets.map((set, setIndex) => (
                              <div key={setIndex} className="flex flex-wrap items-center gap-2 p-2 bg-muted/40 rounded-md">
                                <div className="font-medium min-w-[80px]">Set {setIndex + 1}</div>

                                {getLogType(selectedEx.exercise) === 'reps' ? (
                                  <div className="flex items-center">
                                    <Label htmlFor={`reps-${exIndex}-${setIndex}`} className="mr-2 text-xs">Reps:</Label>
                                    <Input
                                      id={`reps-${exIndex}-${setIndex}`} type="number" min="1" max="1000" className="h-8 w-16"
                                      value={set.reps || ''}
                                      onChange={e => updateSetValue(exIndex, setIndex, 'reps', e.target.value ? Number(e.target.value) : undefined)}
                                      disabled={isSubmitting}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <Label htmlFor={`duration-${exIndex}-${setIndex}`} className="mr-2 text-xs">Duration (sec):</Label>
                                    <Input
                                      id={`duration-${exIndex}-${setIndex}`} type="number" min="1" max="86400" className="h-8 w-16"
                                      value={set.duration || ''}
                                      onChange={e => updateSetValue(exIndex, setIndex, 'duration', e.target.value ? Number(e.target.value) : undefined)}
                                      disabled={isSubmitting}
                                    />
                                  </div>
                                )}

                                <div className="flex items-center">
                                  <Label htmlFor={`weight-${exIndex}-${setIndex}`} className="mr-2 text-xs">Weight (kg, optional):</Label>
                                  <Input
                                    id={`weight-${exIndex}-${setIndex}`} type="number" min="0" max="1000" step="0.5" className="h-8 w-16"
                                    value={set.weight || ''}
                                    onChange={e => updateSetValue(exIndex, setIndex, 'weight', e.target.value ? Number(e.target.value) : undefined)}
                                    disabled={isSubmitting}
                                  />
                                </div>

                                <div className="flex items-center">
                                  <Label htmlFor={`distance-${exIndex}-${setIndex}`} className="mr-2 text-xs">Distance (m, optional):</Label>
                                  <Input
                                    id={`distance-${exIndex}-${setIndex}`} type="number" min="0" max="1000000" step="100" className="h-8 w-20"
                                    value={set.distance || ''}
                                    onChange={e => updateSetValue(exIndex, setIndex, 'distance', e.target.value ? Number(e.target.value) : undefined)}
                                    disabled={isSubmitting}
                                  />
                                </div>

                                <div className="flex items-center">
                                  <Label htmlFor={`rest-${exIndex}-${setIndex}`} className="mr-2 text-xs">Rest (sec):</Label>
                                  <Input
                                    id={`rest-${exIndex}-${setIndex}`} type="number" min="0" max="3600" className="h-8 w-20"
                                    value={set.restAfter ?? 30}
                                    onChange={e => updateSetValue(exIndex, setIndex, 'restAfter', e.target.value ? Number(e.target.value) : undefined)}
                                    disabled={isSubmitting}
                                  />
                                </div>

                                <Button
                                  type="button" variant="ghost" size="icon" className="h-8 w-8 ml-auto"
                                  onClick={() => handleRemoveSet(exIndex, setIndex)} disabled={isSubmitting}
                                  aria-label={`Remove set ${setIndex + 1} from ${selectedEx.exercise.name}`}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}

                            <Button
                              type="button" variant="outline" size="sm"
                              className="w-full flex items-center justify-center gap-1 mt-2"
                              onClick={() => handleAddSet(exIndex)} disabled={isSubmitting}
                            >
                              <Plus className="h-4 w-4" /> Add Set
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

          <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t">
            <Button
              variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting || isDeleting} className="sm:mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Workout
            </Button>
            <Button
              type="submit" className="bg-workout-blue hover:bg-blue-600"
              disabled={!title || !category || selectedExercises.length === 0 || isSubmitting || isDeleting}
            >
              {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : 'Save Changes'}
            </Button>
          </div>
        </form>
      </main>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{workout.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkout} disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>) : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkoutDetail;
