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
import { Loader2, Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { MuscleGroup } from '@/data/muscleGroups';
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
  const { muscleGroups, exercises, createMuscleGroup, updateMuscleGroup, deleteMuscleGroup } = useData();

  const [newName, setNewName] = useState('');
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
    if (!trimmed) return;
    if (nameTaken(trimmed)) {
      toast.error(`"${trimmed}" already exists`);
      return;
    }
    setIsAdding(true);
    try {
      await createMuscleGroup({ name: trimmed });
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

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteMuscleGroup(pendingDelete.id);
      toast.success(`Deleted "${pendingDelete.name}"`);
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
              Add your own, rename one, or remove one you don't use. Deleting a group just untags it
              from any exercises — they aren't deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              placeholder="New muscle group…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAdd(); } }}
              disabled={isAdding}
            />
            <Button onClick={handleAdd} disabled={isAdding || !newName.trim()}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
            {muscleGroups.map(group => (
              <div key={group.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/60">
                {editingId === group.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleRename(group); } if (e.key === 'Escape') cancelEditing(); }}
                      autoFocus
                      disabled={isSaving}
                      className="h-8"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => handleRename(group)} disabled={isSaving}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={cancelEditing} disabled={isSaving}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{group.name}</span>
                    {usageCount(group.id) > 0 && (
                      <span className="text-xs text-muted-foreground">{usageCount(group.id)}</span>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => startEditing(group)} aria-label={`Rename ${group.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
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
        </DialogContent>
      </Dialog>

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
