import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { Exercise } from '@/data/exercises';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import ExerciseItem from './ExerciseItem';
import ExerciseForm from './ExerciseForm';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { ManageMuscleGroupsModal } from './ManageMuscleGroupsModal';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, FileImage, Loader2, Settings2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';

const ExerciseManager: React.FC = () => {
  const { toast } = useToast();
  const {
    exercises,
    exercisesLoading,
    createExercise,
    updateExercise,
    deleteExercise,
    muscleGroups,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManageMusclesOpen, setIsManageMusclesOpen] = useState(false);
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);

  const muscleGroupName = (id: string) => muscleGroups.find(group => group.id === id)?.name ?? id;

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = !searchQuery ||
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.muscleGroups.some(id =>
        muscleGroupName(id).toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesMuscles = selectedMuscles.length === 0 ||
      exercise.muscleGroups.some(id => selectedMuscles.includes(id));
    return matchesSearch && matchesMuscles;
  });
  
  const handleCreateExercise = async (exerciseData: Omit<Exercise, 'id'>) => {
    const existingExercise = exercises.find(
      ex => ex.name.toLowerCase() === exerciseData.name.toLowerCase()
    );
    
    if (existingExercise) {
      toast({
        title: "Error",
        description: `An exercise named "${exerciseData.name}" already exists.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const newExercise = await createExercise(exerciseData);
      toast({
        title: "Exercise created",
        description: `${newExercise.name} has been created successfully.`,
      });
      setIsFormOpen(false);
    } catch (error) {
      console.error('Failed to create exercise:', error);
      toast({
        title: "Error",
        description: "Failed to create exercise. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleUpdateExercise = async (exerciseData: Omit<Exercise, 'id'>) => {
    if (currentExercise) {
      const existingExercise = exercises.find(
        ex => ex.id !== currentExercise.id && 
             ex.name.toLowerCase() === exerciseData.name.toLowerCase()
      );
      
      if (existingExercise) {
        toast({
          title: "Error",
          description: `An exercise named "${exerciseData.name}" already exists.`,
          variant: "destructive",
        });
        return;
      }
      
      setIsSubmitting(true);
      try {
        const updated = await updateExercise(currentExercise.id, exerciseData);
        if (updated) {
          toast({
            title: "Exercise updated",
            description: `${updated.name} has been updated successfully.`,
          });
        }
        setIsFormOpen(false);
        setCurrentExercise(undefined);
      } catch (error) {
        console.error('Failed to update exercise:', error);
        toast({
          title: "Error",
          description: "Failed to update exercise. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  const handleEdit = (exercise: Exercise) => {
    setViewingExercise(null);
    setCurrentExercise(exercise);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (currentExercise) {
      setIsSubmitting(true);
      try {
        const deleted = await deleteExercise(currentExercise.id);
        if (deleted) {
          toast({
            title: "Exercise deleted",
            description: `${deleted.name} has been deleted successfully.`,
          });
        }
      } catch (error) {
        console.error('Failed to delete exercise:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete exercise. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
        setIsDeleteDialogOpen(false);
        setIsFormOpen(false);
        setCurrentExercise(undefined);
      }
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      setIsFormOpen(false);
      setCurrentExercise(undefined);
    }
  };

  if (exercisesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center" role="status" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-workout-blue" />
          <p className="text-muted-foreground">Loading exercises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Exercise Library</h2>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" /> New Exercise
        </Button>
      </div>
      
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search exercises..."
          aria-label="Search exercises"
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-muted-foreground">Filter by muscle group</p>
          <button
            type="button"
            onClick={() => setIsManageMusclesOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Settings2 className="h-3 w-3" /> Manage
          </button>
        </div>
        <ToggleGroup
          type="multiple"
          value={selectedMuscles}
          onValueChange={(value) => setSelectedMuscles(value)}
          className="justify-start flex-wrap"
        >
          {muscleGroups.map((group) => (
            <ToggleGroupItem key={group.id} value={group.id} aria-label={group.name} className="h-7 px-2.5 text-xs">
              {group.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="space-y-3">
        {filteredExercises.length > 0 ? (
          filteredExercises.map((exercise) => (
            <ExerciseItem
              key={exercise.id}
              exercise={exercise}
              onSelect={setViewingExercise}
              onEdit={handleEdit}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-muted/50 rounded-lg border border-dashed">
            <FileImage className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No exercises found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery || selectedMuscles.length > 0
                ? "Try adjusting your search or muscle filter"
                : "Get started by creating a new exercise"}
            </p>
            {!searchQuery && selectedMuscles.length === 0 && (
              <div className="mt-6">
                <Button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="mr-2 h-4 w-4" /> New Exercise
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="fixed bottom-6 right-6 md:hidden">
        <Button
          onClick={() => setIsFormOpen(true)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
      
      <Dialog open={isFormOpen} onOpenChange={(open) => !isSubmitting && !open && handleCancel()}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentExercise ? 'Edit Exercise' : 'Create Exercise'}</DialogTitle>
            <DialogDescription>
              {currentExercise 
                ? 'Update the exercise details below.' 
                : 'Fill in the exercise details to create a new exercise.'}
            </DialogDescription>
          </DialogHeader>
          
          <ExerciseForm 
            exercise={currentExercise} 
            onSubmit={currentExercise ? handleUpdateExercise : handleCreateExercise}
            onCancel={handleCancel}
            onDelete={currentExercise ? () => setIsDeleteDialogOpen(true) : undefined}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => !isSubmitting && setIsDeleteDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the exercise
              "{currentExercise?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
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

      <ManageMuscleGroupsModal isOpen={isManageMusclesOpen} onClose={() => setIsManageMusclesOpen(false)} />

      <ExerciseDetailModal exercise={viewingExercise} onClose={() => setViewingExercise(null)} onEdit={handleEdit} />
    </div>
  );
};

export default ExerciseManager;
