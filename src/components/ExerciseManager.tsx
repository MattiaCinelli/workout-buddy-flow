import React, { useMemo, useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ExerciseItem from './ExerciseItem';
import ExerciseTile from './ExerciseTile';
import ExerciseForm from './ExerciseForm';
import ImportShareButton from './ImportShareButton';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { ManageMuscleGroupsModal } from './ManageMuscleGroupsModal';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, FileImage, Loader2, Settings2, LayoutGrid, List, Library } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { exerciseNamesOverlap } from '@/lib/exerciseAliases';
import {
  ExerciseCategoryFilter, ExerciseDifficultyFilter, filterExerciseLibrary,
} from '@/lib/exerciseLibrary';

type ExerciseViewMode = 'list' | 'tiles';
const VIEW_MODE_KEY = 'workout-buddy-exercise-view';
const initialViewMode = (): ExerciseViewMode => {
  try { return localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'tiles'; }
  catch { return 'tiles'; }
};

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
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategoryFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<ExerciseDifficultyFilter>('all');
  const [viewMode, setViewMode] = useState<ExerciseViewMode>(initialViewMode);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManageMusclesOpen, setIsManageMusclesOpen] = useState(false);
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);

  const filteredExercises = useMemo(() => filterExerciseLibrary(exercises, {
    searchQuery,
    muscleGroupIds: selectedMuscles,
    category: categoryFilter,
    difficulty: difficultyFilter,
  }, id => muscleGroups.find(group => group.id === id)?.name ?? id),
  [exercises, searchQuery, selectedMuscles, categoryFilter, difficultyFilter, muscleGroups]);
  const hasActiveFilters = !!searchQuery.trim() || selectedMuscles.length > 0
    || categoryFilter !== 'all' || difficultyFilter !== 'all';

  const changeViewMode = (value: string) => {
    if (value !== 'list' && value !== 'tiles') return;
    setViewMode(value);
    try { localStorage.setItem(VIEW_MODE_KEY, value); } catch { /* preference is non-essential */ }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedMuscles([]);
    setCategoryFilter('all');
    setDifficultyFilter('all');
  };
  
  const handleCreateExercise = async (exerciseData: Omit<Exercise, 'id'>) => {
    const existingExercise = exercises.find(
      ex => exerciseNamesOverlap(ex, exerciseData)
    );
    
    if (existingExercise) {
      toast({
        title: "Error",
        description: `The name or one of the aliases conflicts with "${existingExercise.name}".`,
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
             exerciseNamesOverlap(ex, exerciseData)
      );
      
      if (existingExercise) {
        toast({
          title: "Error",
          description: `The name or one of the aliases conflicts with "${existingExercise.name}".`,
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
    <div className="relative space-y-6 pb-20">
      <div className="page-heading mb-0">
        <div className="page-heading__main">
          <div className="page-heading__icon"><Library className="h-5 w-5" /></div>
          <div>
            <h1 className="page-title">Exercise library</h1>
            <p className="page-subtitle">Browse, filter, and manage your movement collection</p>
          </div>
        </div>
        <div className="page-actions">
          <ImportShareButton />
          <Button
            onClick={() => setIsFormOpen(true)}
            className="hidden bg-primary hover:bg-primary/90 sm:inline-flex"
          >
            <Plus className="mr-2 h-4 w-4" /> New Exercise
          </Button>
        </div>
      </div>

      <div className="surface-panel space-y-4 p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, alias, or muscle..."
              aria-label="Search exercises"
              className="border-border/80 bg-background/70 pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={categoryFilter} onValueChange={value => setCategoryFilter(value as ExerciseCategoryFilter)}>
            <SelectTrigger aria-label="Filter by exercise type" className="bg-background/70">
              <SelectValue placeholder="All exercise types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All exercise types</SelectItem>
              <SelectItem value="strength">Strength</SelectItem>
              <SelectItem value="cardio">Cardio</SelectItem>
              <SelectItem value="flexibility">Flexibility</SelectItem>
              <SelectItem value="balance">Balance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={value => setDifficultyFilter(value as ExerciseDifficultyFilter)}>
            <SelectTrigger aria-label="Filter by difficulty level" className="bg-background/70">
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-border/60 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Muscle groups</p>
            <button
              type="button"
              onClick={() => setIsManageMusclesOpen(true)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
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
              <ToggleGroupItem key={group.id} value={group.id} aria-label={group.name} className="h-8 rounded-full border border-transparent px-3 text-xs data-[state=on]:border-primary/20 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
                {group.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex min-h-9 items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-medium text-muted-foreground" role="status">
              {filteredExercises.length} of {exercises.length} exercises
            </p>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-primary" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={changeViewMode}
            aria-label="Exercise layout"
            className="shrink-0 rounded-lg border bg-background/70 p-0.5"
          >
            <ToggleGroupItem value="list" aria-label="List view" className="h-8 w-8 p-0 data-[state=on]:bg-card data-[state=on]:shadow-sm">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="tiles" aria-label="Compact tile view" className="h-8 w-8 p-0 data-[state=on]:bg-card data-[state=on]:shadow-sm">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className={viewMode === 'tiles'
        ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
        : 'space-y-3'}>
        {filteredExercises.length > 0 ? (
          filteredExercises.map((exercise) => viewMode === 'tiles'
            ? <ExerciseTile key={exercise.id} exercise={exercise} onSelect={setViewingExercise} onEdit={handleEdit} />
            : <ExerciseItem key={exercise.id} exercise={exercise} onSelect={setViewingExercise} onEdit={handleEdit} />)
        ) : (
          <div className={viewMode === 'tiles'
            ? 'col-span-full text-center py-12 bg-muted/50 rounded-lg border border-dashed'
            : 'text-center py-12 bg-muted/50 rounded-lg border border-dashed'}>
            <FileImage className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No exercises found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Try adjusting your search or filters"
                : "Get started by creating a new exercise"}
            </p>
            {!hasActiveFilters && (
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
