
import React, { useEffect, useRef, useState } from 'react';
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
import { Exercise, defaultSetTargets } from '@/data/exercises';
import ExerciseItem from './ExerciseItem';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2 } from 'lucide-react';
import { WorkoutSet, WorkoutEntry, WORKOUT_CATEGORIES, WORKOUT_CATEGORY_LABELS } from '@/data/workoutHistory';
import { useData } from '@/contexts/useData';
import { DEFAULT_REST_BETWEEN_SETS, DEFAULT_REST_BETWEEN_EXERCISES } from '@/lib/workoutRuntime';
import { expandSetForExercise } from '@/lib/workoutDirections';
import { useWorkoutFolders } from '@/hooks/useWorkoutFolders';
import { exerciseMatchesSearchQuery } from '@/lib/exerciseLibrary';
import { workoutDurationMinutes } from '@/lib/workoutRuntime';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTouchReorder } from '@/hooks/useTouchReorder';
import { demoScopedKey } from '@/lib/demoMode';
import { SelectedExerciseCard, type SelectedExercise } from '@/components/SelectedExerciseCard';

interface CreateWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (workout: WorkoutEntry) => void;
}


const CREATE_WORKOUT_DRAFT_KEY = demoScopedKey('workout-buddy-draft:create-workout');
interface CreateWorkoutDraft {
  title: string; category: string; folder: string; description: string; notes: string;
  restBetweenSets: number; restBetweenExercises: number;
  selectedExercises: Array<{ occurrenceId: string; exerciseId: string; sets: WorkoutSet[] }>;
}

const CreateWorkoutModal: React.FC<CreateWorkoutModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('');
  const [folder, setFolder] = useState('none');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [restBetweenSets, setRestBetweenSets] = useState(DEFAULT_REST_BETWEEN_SETS);
  const [restBetweenExercises, setRestBetweenExercises] = useState(DEFAULT_REST_BETWEEN_EXERCISES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [activeTab, setActiveTab] = useState('exercises');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const touchReorder = useTouchReorder(selectedExercises, setSelectedExercises, item => item.occurrenceId);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const restoredForOpen = useRef(false);
  const { toast } = useToast();
  const { exercises, workouts, createWorkout, muscleGroups } = useData();
  const { folders } = useWorkoutFolders((workouts ?? []).map(workout => workout.folder));
  
  const filteredExercises = exercises.filter(exercise =>
    exerciseMatchesSearchQuery(exercise, searchQuery, muscleGroups)
  );

  const isDirty = !!title.trim() || !!category || folder !== 'none' || !!description.trim()
    || !!notes.trim() || selectedExercises.length > 0
    || restBetweenSets !== DEFAULT_REST_BETWEEN_SETS
    || restBetweenExercises !== DEFAULT_REST_BETWEEN_EXERCISES;

  useEffect(() => {
    if (!isOpen) { restoredForOpen.current = false; return; }
    if (restoredForOpen.current || exercises.length === 0) return;
    restoredForOpen.current = true;
    try {
      const raw = localStorage.getItem(CREATE_WORKOUT_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as CreateWorkoutDraft;
      setTitle(draft.title ?? ''); setCategory(draft.category ?? ''); setFolder(draft.folder ?? 'none');
      setDescription(draft.description ?? ''); setNotes(draft.notes ?? '');
      setRestBetweenSets(draft.restBetweenSets ?? DEFAULT_REST_BETWEEN_SETS);
      setRestBetweenExercises(draft.restBetweenExercises ?? DEFAULT_REST_BETWEEN_EXERCISES);
      setSelectedExercises((draft.selectedExercises ?? []).flatMap(item => {
        const exercise = exercises.find(candidate => candidate.id === item.exerciseId);
        return exercise ? [{ occurrenceId: item.occurrenceId, exercise, sets: item.sets }] : [];
      }));
      setDraftSaved(true);
      toast({ title: 'Workout draft restored', description: 'Your unfinished workout is ready to continue.' });
    } catch { localStorage.removeItem(CREATE_WORKOUT_DRAFT_KEY); }
  }, [isOpen, exercises, toast]);

  useEffect(() => {
    if (!isOpen || !restoredForOpen.current || !isDirty) return;
    const timer = window.setTimeout(() => {
      const draft: CreateWorkoutDraft = {
        title, category, folder, description, notes, restBetweenSets, restBetweenExercises,
        selectedExercises: selectedExercises.map(item => ({
          occurrenceId: item.occurrenceId, exerciseId: item.exercise.id, sets: item.sets,
        })),
      };
      localStorage.setItem(CREATE_WORKOUT_DRAFT_KEY, JSON.stringify(draft));
      setDraftSaved(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [isOpen, isDirty, title, category, folder, description, notes, restBetweenSets, restBetweenExercises, selectedExercises]);
  
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
      
      const workoutData: Omit<WorkoutEntry, 'id'> = {
        title,
        category: category as WorkoutEntry['category'],
        folder: folder === 'none' ? undefined : folder,
        description: description.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
        duration: 0,
        sets: allSets,
        restBetweenSets,
        restBetweenExercises,
        notes: notes.trim() || undefined
      };
      workoutData.duration = workoutDurationMinutes(workoutData as WorkoutEntry, exercises);
      
      const createdWorkout = await createWorkout(workoutData);
      
      toast({
        title: "Workout created!",
        description: `"${title}" has been created with ${selectedExercises.length} exercises.`,
      });
      
      // Reset form and close modal
      setTitle('');
      setCategory('');
      setFolder('none');
      setDescription('');
      setNotes('');
      setRestBetweenSets(DEFAULT_REST_BETWEEN_SETS);
      setRestBetweenExercises(DEFAULT_REST_BETWEEN_EXERCISES);
      setSearchQuery('');
      setSelectedExercises([]);
      setActiveTab('exercises');
      localStorage.removeItem(CREATE_WORKOUT_DRAFT_KEY);
      setDraftSaved(false);
      onCreated?.(createdWorkout);
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
    const occurrenceId = crypto.randomUUID();
    // Pre-fill from the exercise's own defaults rather than a generic
    // category-based guess — e.g. a bodyweight exercise like "Wall Angel"
    // gets its own configured reps/sets instead of always defaulting to
    // 12 reps at 50kg regardless of what the exercise actually is.
    const { reps, duration } = defaultSetTargets(exercise);
    const setCount = exercise.defaultSets ?? 1;
    const defaultSets: WorkoutSet[] = Array.from({ length: setCount }, () => ({
      exerciseId: exercise.id,
      occurrenceId,
      reps,
      weight: exercise.defaultWeight,
      duration,
      distance: exercise.defaultDistance,
      // Left undefined rather than baked in here — the runtime picks
      // between restBetweenSets/restBetweenExercises dynamically based on
      // whether the next set is this same exercise or a different one.
      // Pinning a value at creation time would freeze in whichever case
      // applied then, and stop tracking it if sets get reordered later.
    })).flatMap(set => expandSetForExercise(set, exercise));

    // Add exercise with default sets
    setSelectedExercises([
      ...selectedExercises, 
      { 
        occurrenceId,
        exercise, 
        sets: defaultSets
      }
    ]);
    // Preserve the library tab, search text and scroll position while the
    // user adds several exercises. Do not switch to Selected Exercises here;
    // that forces them to repeatedly navigate back after every choice.
    setActiveTab('exercises');
    
    toast({
      title: "Exercise added",
      description: `${exercise.name} added to workout.`,
    });
  };

  const handleRemoveExercise = (occurrenceId: string) => {
    setSelectedExercises(selectedExercises.filter(item => item.occurrenceId !== occurrenceId));
    
    toast({
      title: "Exercise removed",
      description: "Exercise removed from workout.",
    });
  };

  const handleDuplicateExercise = (exerciseIndex: number) => {
    const source = selectedExercises[exerciseIndex];
    const occurrenceId = crypto.randomUUID();
    const duplicate: SelectedExercise = {
      occurrenceId,
      exercise: source.exercise,
      sets: source.sets.map(set => ({ ...set, occurrenceId })),
    };
    const updated = [...selectedExercises];
    updated.splice(exerciseIndex + 1, 0, duplicate);
    setSelectedExercises(updated);
    toast({ title: "Exercise duplicated", description: `${source.exercise.name} copied with the same set settings.` });
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
      occurrenceId: currentExercise.occurrenceId,
      reps: lastSet.reps,
      weight: lastSet.weight,
      duration: lastSet.duration,
      distance: lastSet.distance,
      direction: lastSet.direction ?? 'none',
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


  const patchSet = (exerciseIndex: number, setIndex: number, patch: Partial<WorkoutSet>) => {
    const updatedExercises = [...selectedExercises];
    updatedExercises[exerciseIndex].sets[setIndex] = {
      ...updatedExercises[exerciseIndex].sets[setIndex],
      ...patch,
    };
    setSelectedExercises(updatedExercises);
  };

  const resetAndClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setCategory('');
      setFolder('none');
      setDescription('');
      setNotes('');
      setRestBetweenSets(DEFAULT_REST_BETWEEN_SETS);
      setRestBetweenExercises(DEFAULT_REST_BETWEEN_EXERCISES);
      setSearchQuery('');
      setSelectedExercises([]);
      setActiveTab('exercises');
      localStorage.removeItem(CREATE_WORKOUT_DRAFT_KEY);
      setDraftSaved(false);
      setDiscardOpen(false);
      onClose();
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    if (isDirty) { setDiscardOpen(true); return; }
    resetAndClose();
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={open => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Workout</DialogTitle>
          <DialogDescription>
            Design your perfect workout routine. Add exercises, sets, and reps to track your progress.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} onWheelCapture={event => {
          const target = event.target as HTMLInputElement;
          if (target.type === 'number' && document.activeElement === target) target.blur();
        }}>
          {isDirty && <p className="mb-2 text-xs text-muted-foreground" role="status">{draftSaved ? 'Draft saved on this device' : 'Saving draft…'}</p>}
          <div className="grid grid-cols-1 gap-4 py-4">
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
              <Label className="text-right">Folder</Label>
              <Select value={folder} onValueChange={setFolder} disabled={isSubmitting}>
                <SelectTrigger className="col-span-3" aria-label="Workout folder"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">No folder</SelectItem>{folders.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
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
                  {selectedExercises.length > 0 && (
                    <div className="mb-4 flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">
                        <strong className="text-foreground">{selectedExercises.length}</strong> selected ·{' '}
                        {selectedExercises.reduce((total, item) => total + item.sets.length, 0)} sets
                      </span>
                      <Button type="button" size="sm" variant="outline" onClick={() => setActiveTab('selected')}>
                        Review
                      </Button>
                    </div>
                  )}
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
                    <div className="space-y-3 max-h-[300px] overflow-y-auto py-2">
                      {selectedExercises.map((selectedEx, exIndex) => (
                        <SelectedExerciseCard
                          key={selectedEx.occurrenceId}
                          selected={selectedEx}
                          index={exIndex}
                          count={selectedExercises.length}
                          disabled={isSubmitting}
                          dragging={touchReorder.draggingId === selectedEx.occurrenceId}
                          dragHandleProps={touchReorder.bind(selectedEx.occurrenceId)} defaultExpanded
                          restBetweenSets={restBetweenSets}
                          restBetweenExercises={restBetweenExercises}
                          onMove={direction => handleMoveExercise(exIndex, direction)}
                          onDuplicate={() => handleDuplicateExercise(exIndex)}
                          onRemove={() => handleRemoveExercise(selectedEx.occurrenceId)}
                          onPatchSet={(setIndex, patch) => patchSet(exIndex, setIndex, patch)}
                          onRemoveSet={setIndex => handleRemoveSet(exIndex, setIndex)}
                          onAddSet={() => handleAddSet(exIndex)}
                        />
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
    <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard this workout draft?</AlertDialogTitle>
          <AlertDialogDescription>Your unfinished workout is saved on this device. Discarding removes that draft.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={resetAndClose}>Discard draft</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default CreateWorkoutModal;
