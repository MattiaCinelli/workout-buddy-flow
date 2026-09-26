import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Pencil, Trash2, Check, X, Plus, Merge } from 'lucide-react';
import { useData } from '@/contexts/useData';
import { MUSCLE_REGIONS, MuscleGroup, type MuscleRegionId } from '@/data/muscleGroups';
import { FULL_BODY_ID, mergeMuscleTags, muscleTagName, regionTag } from '@/lib/muscleRegions';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ManageMuscleGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Add/rename/delete for the muscle-group taxonomy exercises are tagged
// with. Deleting one only untags it from whatever exercises used it
// (DataContext.deleteMuscleGroup) rather than blocking — losing one of
// several descriptive tags doesn't leave an exercise in a broken state,
// unlike deleting an exercise or workout something else depends on.
export function ManageMuscleGroupsModal({ isOpen, onClose }: ManageMuscleGroupsModalProps) {
  const { muscleGroups, exercises, createMuscleGroup, updateMuscleGroup, deleteMuscleGroup, restoreMuscleGroup, updateExercise } = useData();

  const [newName, setNewName] = useState('');
  // A new group must go in a region, so the list can't sprawl flat again.
  const [newRegion, setNewRegion] = useState<MuscleRegionId | ''>('');
  const [pendingMerge, setPendingMerge] = useState<MuscleGroup | null>(null);
  const [mergeTarget, setMergeTarget] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MuscleGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const usageCount = (id: string) => exercises.filter(exercise => exercise.muscleGroups.includes(id)).length;

  const nameTaken = (name: string, ignoreId?: string) =>
    muscleGroups.some(group => group.id !== ignoreId && group.name.toLowerCase() === name.toLowerCase());

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed || !newRegion) return;
    if (nameTaken(trimmed)) {
      toast.error(`"${trimmed}" already exists`);
      return;
    }
    setIsAdding(true);
    try {
      await createMuscleGroup({ name: trimmed, region: newRegion });
      setNewName('');
      toast.success(`Added "${trimmed}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add muscle group');
    } finally {
      setIsAdding(false);
    }
  };

  const startEditing = (group: MuscleGroup) => {
    setEditingId(group.id);
    setEditingName(group.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleRename = async (group: MuscleGroup) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    if (trimmed === group.name) { cancelEditing(); return; }
    if (nameTaken(trimmed, group.id)) {
      toast.error(`"${trimmed}" already exists`);
      return;
    }
    setIsSaving(true);
    try {
      await updateMuscleGroup(group.id, { name: trimmed });
      cancelEditing();
      toast.success(`Renamed to "${trimmed}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not rename muscle group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegionChange = async (group: MuscleGroup, region: MuscleRegionId) => {
    try {
      await updateMuscleGroup(group.id, { region });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not move muscle group');
    }
  };

  // Folds a group into another muscle or a whole region: every exercise
  // tagged with it is re-tagged, then the group is deleted. Undo restores
  // both. The delete runs first because it untags from the exercise list
  // as of this render; the merged tags are written after it, so they win.
  const handleMerge = async () => {
    const group = pendingMerge;
    if (!group || !mergeTarget) return;
    setIsMerging(true);
    try {
      const affected = exercises.filter(exercise => exercise.muscleGroups.includes(group.id));
      const deleted = await deleteMuscleGroup(group.id);
      await Promise.all(affected.map(exercise => updateExercise(exercise.id, {
        muscleGroups: mergeMuscleTags(exercise.muscleGroups, group.id, mergeTarget, muscleGroups),
      })));
      toast.success(`Merged "${group.name}" into "${muscleTagName(mergeTarget, muscleGroups)}"`, {
        description: affected.length ? `${affected.length} exercise${affected.length === 1 ? '' : 's'} re-tagged.` : undefined,
        action: deleted ? { label: 'Undo', onClick: () => void (async () => {
          await restoreMuscleGroup(deleted);
          await Promise.all(affected.map(exercise => updateExercise(exercise.id, { muscleGroups: exercise.muscleGroups })));
        })() } : undefined,
      });
      setPendingMerge(null);
      setMergeTarget('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not merge muscle group');
    } finally {
      setIsMerging(false);
    }
  };

  // Full Body belongs to every region by design, so it is never "unsorted".
  const sections = [
    { id: 'unsorted', name: 'Unsorted — pick a region', groups: muscleGroups.filter(group => !group.region && group.id !== FULL_BODY_ID) },
    ...MUSCLE_REGIONS.map(region => ({ id: region.id, name: region.name, groups: muscleGroups.filter(group => group.region === region.id) })),
    { id: 'whole', name: 'Whole body', groups: muscleGroups.filter(group => group.id === FULL_BODY_ID) },
  ];

  const regionSelect = (group: MuscleGroup, className: string) => (
    <Select value={group.region ?? ''} onValueChange={value => void handleRegionChange(group, value as MuscleRegionId)}>
      <SelectTrigger className={className} aria-label={`Region of ${group.name}`}>
        <SelectValue placeholder="Pick region…" />
      </SelectTrigger>
      <SelectContent>
        {MUSCLE_REGIONS.map(region => <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      const group = pendingDelete;
      const affected = exercises.filter(exercise => exercise.muscleGroups.includes(group.id));
      const deleted = await deleteMuscleGroup(group.id);
      toast.success(`Deleted "${group.name}"`, { action: deleted ? { label: 'Undo', onClick: () => void (async () => {
        await restoreMuscleGroup(deleted);
        await Promise.all(affected.map(exercise => updateExercise(exercise.id, { muscleGroups: exercise.muscleGroups })));
      })() } : undefined });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete muscle group');
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[420px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Muscle Groups</DialogTitle>
            <DialogDescription>
              Every muscle group sits in one of five body regions. Add your own, move, rename, merge
              duplicates into another, or remove one. Exercises are never deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              placeholder="New muscle group…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAdd(); } }}
              disabled={isAdding}
              className="col-span-2"
            />
            <Select value={newRegion} onValueChange={value => setNewRegion(value as MuscleRegionId)} disabled={isAdding}>
              <SelectTrigger aria-label="Region for the new muscle group"><SelectValue placeholder="Choose its region" /></SelectTrigger>
              <SelectContent>
                {MUSCLE_REGIONS.map(region => <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={isAdding || !newName.trim() || !newRegion} aria-label="Add muscle group">
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-3">
            {sections.map(section => section.groups.length > 0 && (
              <section key={section.id} aria-label={section.name}>
                <h3 className={`mb-1 px-2 text-xs font-semibold uppercase tracking-wide ${section.id === 'unsorted' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{section.name}</h3>
                <div className="space-y-0.5">
            {section.groups.map(group => (
              <div key={group.id} className="flex flex-wrap items-center gap-1 py-1 px-2 rounded-md hover:bg-muted/60">
                {editingId === group.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleRename(group); } if (e.key === 'Escape') cancelEditing(); }}
                      autoFocus
                      disabled={isSaving}
                      className="h-8 min-w-0 flex-1"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => handleRename(group)} disabled={isSaving}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={cancelEditing} disabled={isSaving}>
                      <X className="h-4 w-4" />
                    </Button>
                    {group.id !== FULL_BODY_ID && regionSelect(group, 'mt-1 h-8 w-full text-xs')}
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm">{group.name}</span>
                    {usageCount(group.id) > 0 && (
                      <span className="text-xs text-muted-foreground">{usageCount(group.id)}</span>
                    )}
                    {section.id === 'unsorted' && regionSelect(group, 'h-8 w-[7.5rem] shrink-0 text-xs')}
                    <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => startEditing(group)} aria-label={`Edit ${group.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => { setMergeTarget(''); setPendingMerge(group); }} aria-label={`Merge ${group.name} into another`}>
                      <Merge className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0 text-destructive hover:text-destructive"
                      onClick={() => setPendingDelete(group)} aria-label={`Delete ${group.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
                </div>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingMerge} onOpenChange={open => !isMerging && !open && setPendingMerge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge "{pendingMerge?.name}" into…</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMerge && usageCount(pendingMerge.id) > 0
                ? `Its ${usageCount(pendingMerge.id)} exercise${usageCount(pendingMerge.id) === 1 ? '' : 's'} will be tagged with what you pick instead, and "${pendingMerge.name}" is removed.`
                : `No exercises use it; "${pendingMerge?.name}" is just removed.`}
              {' '}Pick a whole region to replace a general label like "Leg".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={mergeTarget} onValueChange={setMergeTarget} disabled={isMerging}>
            <SelectTrigger aria-label="Merge into"><SelectValue placeholder="Choose a region or muscle" /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Whole region</SelectLabel>
                {MUSCLE_REGIONS.map(region => <SelectItem key={region.id} value={regionTag(region.id)}>{region.name}</SelectItem>)}
              </SelectGroup>
              {MUSCLE_REGIONS.map(region => {
                const options = muscleGroups.filter(group => group.region === region.id && group.id !== pendingMerge?.id);
                return options.length > 0 && (
                  <SelectGroup key={region.id}>
                    <SelectLabel>{region.name}</SelectLabel>
                    {options.map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMerging}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={event => { event.preventDefault(); void handleMerge(); }} disabled={isMerging || !mergeTarget}>
              {isMerging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={open => !isDeleting && !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && usageCount(pendingDelete.id) > 0
                ? `This will remove it from ${usageCount(pendingDelete.id)} exercise${usageCount(pendingDelete.id) === 1 ? '' : 's'} currently tagged with it. Those exercises won't be deleted.`
                : 'No exercises are currently tagged with it.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
