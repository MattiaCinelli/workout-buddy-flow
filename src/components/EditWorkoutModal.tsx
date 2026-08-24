import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Exercise } from '@/data/exercises';
import ExerciseItem from './ExerciseItem';
import { useToast } from '@/hooks/use-toast';
import { Search, Minus, Plus, Loader2, Trash2 } from 'lucide-react';
import { WorkoutSet, WorkoutEntry } from '@/data/workoutHistory';
import { useData } from '@/contexts/DataContext';

interface EditWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: WorkoutEntry;
}

interface SelectedExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
}

const EditWorkoutModal: React.FC<EditWorkoutModalProps> = ({ isOpen, onClose, workout }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [activeTab, setActiveTab] = useState('selected');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();
  const { exercises, updateWorkout, deleteWorkout } = useData();
  const navigate = useNavigate();
  
  // Initialize form with workout data when modal opens
  useEffect(() => {
    if (isOpen && workout) {
      setTitle(workout.title);
      setCategory(workout.category);
      setNotes(workout.notes || '');
      
      // Group sets by exercise and create SelectedExercise array
      const exerciseMap = new Map<string, WorkoutSet[]>();
      workout.sets.forEach(set => {
        if (!exerciseMap.has(set.exerciseId)) {
          exerciseMap.set(set.exerciseId, []);
        }
        exerciseMap.get(set.exerciseId)!.push(set);
      });
      
      const selected: SelectedExercise[] = [];
      exerciseMap.forEach((sets, exerciseId) => {
        const exercise = exercises.find(ex => ex.id === exerciseId);
        if (exercise) {
          selected.push({ exercise, sets });
        }
      });
      
      setSelectedExercises(selected);
      setActiveTab('selected');
    }
  }, [isOpen, workout, exercises]);
  
  const filteredExercises = exercises.filter(exercise => 
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.muscleGroups.some(group => 
      group.toLowerCase().includes(searchQuery.toLowerCase())
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
      
      await updateWorkout(workout.id, {
        title,
        category: category as WorkoutEntry['category'],
        duration: estimatedDuration,
        sets: allSets,
        notes: notes.trim() || undefined,
      });
      
      toast({
        title: "Workout updated!",
        description: `"${title}" has been updated successfully.`,
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to update workout:', error);
      toast({
        title: "Error",
        description: "Failed to update workout. Please try again.",
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
    
    // Create default sets based on exercise category
    const defaultSets: WorkoutSet[] = [];
    const isTimeBasedExercise = exercise.category === 'cardio' || exercise.category === 'flexibility';
    
    // Add default set
    defaultSets.push({
      exerciseId: exercise.id,
      reps: isTimeBasedExercise ? undefined : 12,
      weight: exercise.category === 'strength' ? 50 : undefined,
      duration: isTimeBasedExercise ? 60 : undefined,
      distance: exercise.category === 'cardio' ? 1000 : undefined,
      restAfter: 60
    });
    
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
      restAfter: 60
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

  const handleClose = () => {
    if (!isSubmitting && !isDeleting) {
      setSearchQuery('');
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const handleDeleteWorkout = async () => {
    setIsDeleting(true);
    try {
      await deleteWorkout(workout.id);
      toast({
        title: "Workout deleted",
        description: `"${workout.title}" has been deleted.`,
      });
      onClose();
      navigate('/');
    } catch (error) {
      console.error('Failed to delete workout:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete workout. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Workout</DialogTitle>
          <DialogDescription>
            Modify your workout routine. Update exercises, sets, and reps.
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
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="flexibility">Flexibility</SelectItem>
                  <SelectItem value="balance">Balance</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-workout-notes" className="text-right pt-2">
                Notes
              </Label>
              <textarea
                id="edit-workout-notes"
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
                  <TabsTrigger value="selected" disabled={isSubmitting}>
                    Selected Exercises ({selectedExercises.length})
                  </TabsTrigger>
                  <TabsTrigger value="exercises" disabled={isSubmitting}>Exercise Library</TabsTrigger>
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
                      Add exercises from the Exercise Library tab.
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[300px] overflow-y-auto py-2">
                      {selectedExercises.map((selectedEx, exIndex) => (
                        <div key={selectedEx.exercise.id} className="border rounded-md p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium text-base">{selectedEx.exercise.name}</h3>
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
                              <div key={setIndex} className="flex flex-wrap items-center gap-2 p-2 bg-muted/40 rounded-md">
                                <div className="font-medium min-w-[80px]">Set {setIndex + 1}</div>
                                
                                {selectedEx.exercise.category === 'strength' && (
                                  <>
                                    <div className="flex items-center">
                                      <Label htmlFor={`reps-${exIndex}-${setIndex}`} className="mr-2 text-xs">
                                        Reps:
                                      </Label>
                                      <Input
                                        id={`reps-${exIndex}-${setIndex}`}
                                        type="number"
                                        min="1"
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
                                    <div className="flex items-center">
                                      <Label htmlFor={`weight-${exIndex}-${setIndex}`} className="mr-2 text-xs">
                                        Weight:
                                      </Label>
                                      <Input
                                        id={`weight-${exIndex}-${setIndex}`}
                                        type="number"
                                        min="0"
                                        step="2.5"
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
                                  </>
                                )}
                                
                                {(selectedEx.exercise.category === 'cardio' || 
                                 selectedEx.exercise.category === 'flexibility' ||
                                 selectedEx.exercise.category === 'balance') && (
                                  <div className="flex items-center">
                                    <Label htmlFor={`duration-${exIndex}-${setIndex}`} className="mr-2 text-xs">
                                      Duration (sec):
                                    </Label>
                                    <Input
                                      id={`duration-${exIndex}-${setIndex}`}
                                      type="number"
                                      min="1"
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
                                
                                {selectedEx.exercise.category === 'cardio' && (
                                  <div className="flex items-center">
                                    <Label htmlFor={`distance-${exIndex}-${setIndex}`} className="mr-2 text-xs">
                                      Distance (m):
                                    </Label>
                                    <Input
                                      id={`distance-${exIndex}-${setIndex}`}
                                      type="number"
                                      min="0"
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
                                )}
                                
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 ml-auto"
                                  onClick={() => handleRemoveSet(exIndex, setIndex)}
                                  disabled={isSubmitting}
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              type="button" 
              onClick={() => setShowDeleteConfirm(true)} 
              disabled={isSubmitting || isDeleting}
              className="sm:mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Workout
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={handleClose} disabled={isSubmitting || isDeleting}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-workout-blue hover:bg-blue-600"
                disabled={!title || !category || selectedExercises.length === 0 || isSubmitting || isDeleting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

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
              onClick={handleDeleteWorkout}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default EditWorkoutModal;
