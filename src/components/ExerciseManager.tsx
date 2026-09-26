import { MUSCLE_REGIONS } from '@/data/muscleGroups';
import { effectiveMuscleFilter, regionOfTag, regionTag } from '@/lib/muscleRegions';
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
import { deleteExerciseFormDraft } from '@/lib/exerciseDraft';
import ImportShareButton from './ImportShareButton';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { ManageMuscleGroupsModal } from './ManageMuscleGroupsModal';
import { ManageEquipmentModal } from './ManageEquipmentModal';
import { useEquipment } from '@/hooks/useEquipment';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, X, FileImage, Loader2, Settings2, LayoutGrid, List, Library } from 'lucide-react';
import { useData } from '@/contexts/useData';
import { exerciseNamesConflict } from '@/lib/exerciseAliases';
import CardStack from '@/components/CardStack';
import { ToastAction } from '@/components/ui/toast';
import {
  ExerciseCategoryFilter, ExerciseDifficultyFilter, filterExerciseLibrary,
} from '@/lib/exerciseLibrary';

type ExerciseViewMode = 'list' | 'tiles';
type ExerciseSortOrder = 'name-asc' | 'name-desc';
const VIEW_MODE_KEY = 'workout-buddy-exercise-view';
const SORT_ORDER_KEY = 'workout-buddy-exercise-sort';
const initialViewMode = (): ExerciseViewMode => {
  try { return localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'tiles'; }
  catch { return 'tiles'; }
};
const initialSortOrder = (): ExerciseSortOrder => {
  try { return localStorage.getItem(SORT_ORDER_KEY) === 'name-desc' ? 'name-desc' : 'name-asc'; }
  catch { return 'name-asc'; }
};

const ExerciseManager: React.FC = () => {
  const { toast } = useToast();
  const {
    exercises,
    exercisesLoading,
    createExercise,
    updateExercise,
    deleteExercise,
    restoreExercise,
    muscleGroups,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategoryFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<ExerciseDifficultyFilter>('all');
  const [viewMode, setViewMode] = useState<ExerciseViewMode>(initialViewMode);
  const [sortOrder, setSortOrder] = useState<ExerciseSortOrder>(initialSortOrder);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [discardFormOpen, setDiscardFormOpen] = useState(false);
  const [isManageMusclesOpen, setIsManageMusclesOpen] = useState(false);
  const [isManageEquipmentOpen, setIsManageEquipmentOpen] = useState(false);
  const { equipment: equipmentOptions } = useEquipment();
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);

  const filteredExercises = useMemo(() => filterExerciseLibrary(exercises, {
    searchQuery,
    muscleGroupIds: effectiveMuscleFilter(selectedMuscles, muscleGroups),
    equipment: selectedEquipment,
    category: categoryFilter,
    difficulty: difficultyFilter,
  }, muscleGroups),
  [exercises, searchQuery, selectedMuscles, selectedEquipment, categoryFilter, difficultyFilter, muscleGroups]);
  const hasActiveFilters = !!searchQuery.trim() || selectedMuscles.length > 0
    || selectedEquipment.length > 0
    || categoryFilter !== 'all' || difficultyFilter !== 'all';
  const sortedExercises = useMemo(() => [...filteredExercises].sort((a, b) => {
    const comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    return sortOrder === 'name-asc' ? comparison : -comparison;
  }), [filteredExercises, sortOrder]);
  const exerciseGroups = Array.from(sortedExercises.reduce((groups, exercise) => {
    const key = exercise.collectionId ?? `exercise:${exercise.id}`;
    groups.set(key, [...(groups.get(key) ?? []), exercise]);
    return groups;
  }, new Map<string, Exercise[]>()).values());

  const changeViewMode = (value: string) => {
    if (value !== 'list' && value !== 'tiles') return;
    setViewMode(value);
    try { localStorage.setItem(VIEW_MODE_KEY, value); } catch { /* preference is non-essential */ }
  };

  const changeSortOrder = (value: ExerciseSortOrder) => {
    setSortOrder(value);
    try { localStorage.setItem(SORT_ORDER_KEY, value); } catch { /* preference is non-essential */ }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedMuscles([]);
    setSelectedEquipment([]);
    setCategoryFilter('all');
    setDifficultyFilter('all');
  };
  
  const handleCreateExercise = async (exerciseData: Omit<Exercise, 'id'>) => {
    const existingExercise = exercises.find(
      ex => exerciseNamesConflict(ex, exerciseData)
    );
    
    if (existingExercise) {
      toast({
        title: "Error",
        description: `An exercise named "${existingExercise.name}" already exists.`,
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
      setFormDirty(false);
      void deleteExerciseFormDraft();
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
             exerciseNamesConflict(ex, exerciseData)
      );
      
      if (existingExercise) {
        toast({
          title: "Error",
          description: `An exercise named "${existingExercise.name}" already exists.`,
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
        setFormDirty(false);
        void deleteExerciseFormDraft(currentExercise.id);
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
    setFormDirty(false);
    setIsFormOpen(true);
  };

  const handleDuplicate = async (exercise: Exercise) => {
    const names = new Set(exercises.map(item => item.name.trim().toLocaleLowerCase()));
    let name = `${exercise.name} Copy`;
    let suffix = 2;
    while (names.has(name.toLocaleLowerCase())) name = `${exercise.name} Copy ${suffix++}`;
    const copy = Object.fromEntries(
      Object.entries(exercise).filter(([key]) => !['id', 'updatedAt', 'deletedAt'].includes(key)),
    ) as Omit<Exercise, 'id'>;
    try {
      const created = await createExercise({ ...copy, name, aliases: undefined });
      setViewingExercise(null);
      setCurrentExercise(created);
      setIsFormOpen(true);
      toast({ title: 'Exercise duplicated', description: `Created “${created.name}”.` });
    } catch (error) {
      console.error('Failed to duplicate exercise:', error);
      toast({ title: 'Error', description: 'Failed to duplicate exercise.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (currentExercise) {
      setIsSubmitting(true);
      try {
        const deleted = await deleteExercise(currentExercise.id);
        if (deleted) {
          void deleteExerciseFormDraft(deleted.id);
          toast({
            title: "Exercise deleted",
            description: `${deleted.name} was removed.`,
            action: <ToastAction altText={`Undo deletion of ${deleted.name}`} onClick={() => void restoreExercise(deleted)}>Undo</ToastAction>,
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
    if (isSubmitting) return;
    if (formDirty) {
      setDiscardFormOpen(true);
      return;
    }
    setIsFormOpen(false);
    setCurrentExercise(undefined);
  };

  const discardForm = () => {
    if (!isSubmitting) {
      void deleteExerciseFormDraft(currentExercise?.id);
      setDiscardFormOpen(false);
      setFormDirty(false);
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
              className={`border-border/80 bg-background/70 pl-9 ${searchQuery ? 'pr-9' : ''}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear exercise search"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
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
              <SelectItem value="warmup">Warm-up</SelectItem>
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

        <div className="grid min-w-0 gap-4 border-t border-border/60 pt-3 md:grid-cols-2 md:gap-0 md:divide-x md:divide-border/60">
          <div className="min-w-0 md:pr-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Muscle groups</p>
              <button
                type="button"
                onClick={() => setIsManageMusclesOpen(true)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <Settings2 className="h-3 w-3" /> Manage
              </button>
            </div>
            {/* Regions first; picking one reveals its muscles to narrow it down.
                Groups without a region (and Full Body) sit after the regions. */}
            <ToggleGroup
              type="multiple"
              value={selectedMuscles}
              onValueChange={(value) => {
                // Deselecting a region also clears the muscles picked inside it.
                const openRegions = new Set(value.map(regionOfTag).filter(Boolean));
                setSelectedMuscles(value.filter(tag => {
                  const region = muscleGroups.find(group => group.id === tag)?.region;
                  return !region || openRegions.has(region);
                }));
              }}
              className="max-w-full justify-start flex-nowrap overflow-x-auto pb-1"
            >
              {[
                ...MUSCLE_REGIONS.map(region => ({ tag: regionTag(region.id), label: region.name })),
                ...muscleGroups.filter(group => !group.region).map(group => ({ tag: group.id, label: group.name })),
              ].map(({ tag, label }) => (
                <ToggleGroupItem key={tag} value={tag} aria-label={label} className="h-8 shrink-0 rounded-full border border-border/60 bg-muted/45 px-3 text-xs data-[state=on]:border-primary/25 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {MUSCLE_REGIONS.filter(region => selectedMuscles.includes(regionTag(region.id))).map(region => (
              <ToggleGroup
                key={region.id}
                type="multiple"
                aria-label={`${region.name} muscles`}
                value={selectedMuscles}
                onValueChange={setSelectedMuscles}
                className="mt-1.5 max-w-full justify-start flex-nowrap overflow-x-auto border-l-2 border-primary/30 pb-1 pl-2"
              >
                {muscleGroups.filter(group => group.region === region.id).map(group => (
                  <ToggleGroupItem key={group.id} value={group.id} aria-label={group.name} className="h-7 shrink-0 rounded-full border border-border/60 bg-transparent px-2.5 text-xs data-[state=on]:border-primary/25 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
                    {group.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            ))}
          </div>

          <div className="min-w-0 md:pl-4">
          <div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Equipment</p><button type="button" onClick={() => setIsManageEquipmentOpen(true)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"><Settings2 className="h-3 w-3" /> Manage</button></div>
          <ToggleGroup type="multiple" value={selectedEquipment} onValueChange={setSelectedEquipment}
            className="max-w-full justify-start flex-nowrap overflow-x-auto pb-1">
            {equipmentOptions.map(item => (
              <ToggleGroupItem key={item} value={item} aria-label={`Equipment: ${item}`}
                className="h-8 shrink-0 rounded-full border border-border/60 bg-muted/45 px-3 text-xs data-[state=on]:border-primary/25 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
                {item}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          </div>
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
          <div className="flex shrink-0 items-center gap-2">
          <Select value={sortOrder} onValueChange={value => changeSortOrder(value as ExerciseSortOrder)}>
            <SelectTrigger className="h-9 w-[8.5rem]" aria-label="Sort exercises">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name: A–Z</SelectItem>
              <SelectItem value="name-desc">Name: Z–A</SelectItem>
            </SelectContent>
          </Select>
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
      </div>

      <div className={viewMode === 'tiles'
        ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
        : 'space-y-3'}>
        {filteredExercises.length > 0 ? (
          exerciseGroups.map(items => {
            const render = (exercise: Exercise) => viewMode === 'tiles'
              ? <ExerciseTile key={exercise.id} exercise={exercise} onSelect={setViewingExercise} onEdit={handleEdit} />
              : <ExerciseItem key={exercise.id} exercise={exercise} onSelect={setViewingExercise} onEdit={handleEdit} />;
            return items.length > 1 ? <CardStack key={items[0].collectionId} front={render(items[0])} count={items.length - 1} label="more exercise" forceExpanded={!!searchQuery.trim()}>{items.slice(1).map(render)}</CardStack> : render(items[0]);
          })
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
                  onClick={() => { setFormDirty(false); setCurrentExercise(undefined); setIsFormOpen(true); }}
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
          onClick={() => { setFormDirty(false); setCurrentExercise(undefined); setIsFormOpen(true); }}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
      
      <Dialog open={isFormOpen} onOpenChange={(open) => !isSubmitting && !open && handleCancel()}>
        <DialogContent
          className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={(event) => {
            // Do not let Radix focus/select the first field (the exercise
            // name) when this dialog opens. On mobile, the resulting text
            // selection makes an existing name very easy to delete by
            // accident. Users can still tap the field or Tab to it normally.
            event.preventDefault();
          }}
        >
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
            onDirtyChange={setFormDirty}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardFormOpen} onOpenChange={setDiscardFormOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved exercise changes?</AlertDialogTitle>
            <AlertDialogDescription>Your changes have not been saved and will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={discardForm}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
      <ManageEquipmentModal isOpen={isManageEquipmentOpen} onClose={() => setIsManageEquipmentOpen(false)} />

      <ExerciseDetailModal exercise={viewingExercise} onClose={() => setViewingExercise(null)} onEdit={handleEdit} onDuplicate={handleDuplicate} />
    </div>
  );
};

export default ExerciseManager;
