import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Dumbbell, Folder, Pencil, Trash2, ChevronRight } from "lucide-react";
import Navbar from '@/components/Navbar';
import CreateWorkoutModal from '@/components/CreateWorkoutModal';
import ImportShareButton from '@/components/ImportShareButton';
import WorkoutCard from '@/components/WorkoutCard';
import { useData } from '@/contexts/useData';
import { WORKOUT_CATEGORIES, WORKOUT_CATEGORY_LABELS } from '@/data/workoutHistory';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { folderName, isFolderOrDescendant, rebaseFolderPath, useWorkoutFolders } from '@/hooks/useWorkoutFolders';
import { workoutContainsExerciseQuery } from '@/lib/workoutSearch';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { writeWorkoutFolders } from '@/lib/workoutFolders';

const WorkoutsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [createWorkoutOpen, setCreateWorkoutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [newFolder, setNewFolder] = useState('');
  const { workouts, exercises, workoutsLoading, updateWorkout } = useData();
  const { folders, addFolder, renameFolder, moveFolder, deleteFolder } = useWorkoutFolders(workouts.map(workout => workout.folder));

  const filteredWorkouts = workouts
    .filter(workout => {
      const matchesSearch = workout.title.toLowerCase().includes(searchQuery.toLowerCase())
        || workoutContainsExerciseQuery(workout, exercises, searchQuery);
      const matchesCategory = categoryFilter === 'all' || workout.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite));
  const folderCards = folders.filter(folder => !folder.includes(' / ')).map(folder => ({ folder, workouts: filteredWorkouts.filter(workout => isFolderOrDescendant(workout.folder ?? '', folder)) }));
  const unfiled = filteredWorkouts.filter(workout => !workout.folder);
  const createFolder = () => { if (!newFolder.trim()) return; addFolder(newFolder); setNewFolder(''); };
  const rename = async (folder: string) => {
    const next = window.prompt('Rename workout folder', folder)?.trim();
    if (!next || next === folder) return;
    await Promise.all(workouts.filter(workout => workout.folder && isFolderOrDescendant(workout.folder, folder)).map(workout => updateWorkout(workout.id, { folder: `${next}${workout.folder!.slice(folder.length)}` })));
    renameFolder(folder, next);
  };
  const removeFolder = async (folder: string) => {
    const affected = workouts.filter(workout => workout.folder && isFolderOrDescendant(workout.folder, folder));
    if (!window.confirm(`Delete the “${folder}” folder? ${affected.length} workout${affected.length === 1 ? '' : 's'} will move to My Workouts and can be restored with Undo.`)) return;
    const previousFolders = [...folders];
    await Promise.all(affected.map(workout => updateWorkout(workout.id, { folder: undefined })));
    deleteFolder(folder);
    toast({
      title: 'Folder deleted',
      description: `${affected.length} workout${affected.length === 1 ? '' : 's'} moved to My Workouts.`,
      action: <ToastAction altText={`Undo deletion of ${folder}`} onClick={() => void (async () => {
        writeWorkoutFolders(previousFolders);
        await Promise.all(affected.map(workout => updateWorkout(workout.id, { folder: workout.folder })));
      })()}>Undo</ToastAction>,
    });
  };
  const moveWorkout = (workoutId: string, folder?: string) => updateWorkout(workoutId, { folder });
  const nestFolder = async (source: string, target?: string) => {
    if (source === target || (target && isFolderOrDescendant(target, source))) return;
    await Promise.all(workouts.filter(workout => workout.folder && isFolderOrDescendant(workout.folder, source)).map(workout => updateWorkout(workout.id, { folder: rebaseFolderPath(workout.folder!, source, target) })));
    moveFolder(source, target);
  };
  const renderWorkout = (workout: typeof workouts[number]) => <div key={workout.id} draggable onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/workout-id', workout.id); }} className="cursor-grab active:cursor-grabbing" aria-label={`Drag ${workout.title}`}><WorkoutCard workout={workout} onToggleFavorite={item => updateWorkout(item.id, { favorite: !item.favorite })} /></div>;

  if (workoutsLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading workouts...</p>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="app-page">
        {/* Header */}
        <div className="page-heading">
          <div className="page-heading__main">
            <div className="page-heading__icon"><Dumbbell className="h-5 w-5" /></div>
            <div>
            <h1 className="page-title">My workouts</h1>
            <p className="page-subtitle">
              {workouts.length} workout{workouts.length !== 1 ? 's' : ''} created
            </p>
            </div>
          </div>
          
          <div className="page-actions">
            <ImportShareButton />
            <Button onClick={() => setCreateWorkoutOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Workout
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="surface-panel mb-7 flex flex-col gap-3 p-3 sm:flex-row sm:p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workouts..."
              aria-label="Search workouts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {WORKOUT_CATEGORIES.map(value => (
                <SelectItem key={value} value={value}>{WORKOUT_CATEGORY_LABELS[value]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="surface-panel mb-5 flex flex-col gap-2 p-3 sm:flex-row sm:items-center" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const workoutId = event.dataTransfer.getData('text/workout-id'); const draggedFolder = event.dataTransfer.getData('text/workout-folder'); if (workoutId) void moveWorkout(workoutId); else if (draggedFolder) void nestFolder(draggedFolder); }}>
          <div className="flex items-center gap-2 text-sm font-medium"><Folder className="h-4 w-4 text-primary" /> Workout folders</div>
          <Input value={newFolder} onChange={event => setNewFolder(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') createFolder(); }} placeholder="New folder name" aria-label="New workout folder name" className="sm:ml-auto sm:max-w-xs" />
          <Button type="button" variant="outline" onClick={createFolder} disabled={!newFolder.trim()}><Plus className="mr-1 h-4 w-4" />Create folder</Button>
        </div>
        
        {/* Workouts Grid */}
        {filteredWorkouts.length > 0 || (!searchQuery && categoryFilter === 'all' && folders.length > 0) ? (
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 lg:grid-cols-3">
            {folderCards.filter(group => group.workouts.length || (!searchQuery && categoryFilter === 'all')).map(group => <section key={group.folder} draggable onDragStart={event => { event.stopPropagation(); event.dataTransfer.setData('text/workout-folder', group.folder); event.dataTransfer.effectAllowed = 'move'; }} className="group relative min-h-40 cursor-grab rounded-xl border-2 border-dashed border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg active:cursor-grabbing" onDragOver={event => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; }} onDrop={event => { event.preventDefault(); event.stopPropagation(); const workoutId = event.dataTransfer.getData('text/workout-id'); const draggedFolder = event.dataTransfer.getData('text/workout-folder'); if (workoutId) void moveWorkout(workoutId, group.folder); else if (draggedFolder) void nestFolder(draggedFolder, group.folder); }}>
              <button type="button" className="flex h-full w-full flex-col items-start text-left" onClick={() => navigate(`/workouts/folders/${encodeURIComponent(group.folder)}`)}>
                <div className="mb-5 flex w-full items-start justify-between"><span className="rounded-xl bg-primary/15 p-3 text-primary"><Folder className="h-8 w-8" /></span><ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" /></div>
                <h2 className="text-lg font-bold">{folderName(group.folder)}</h2><p className="mt-1 text-sm text-muted-foreground">{group.workouts.length} workout{group.workouts.length === 1 ? '' : 's'} · Drop cards or folders here</p>
              </button>
              <div className="absolute right-4 top-14 flex gap-1"><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => void rename(group.folder)} aria-label={`Rename ${group.folder} folder`}><Pencil className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => void removeFolder(group.folder)} aria-label={`Delete ${group.folder} folder`}><Trash2 className="h-4 w-4" /></Button></div>
            </section>)}
            {unfiled.map(renderWorkout)}
          </div>
        ) : workouts.length > 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No workouts match your filters</p>
            <Button 
              variant="link" 
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="text-center py-16">
            <Dumbbell className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No workouts yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first workout to get started on your fitness journey
            </p>
            <Button onClick={() => setCreateWorkoutOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Your First Workout
            </Button>
          </div>
        )}
      </main>
      
      <CreateWorkoutModal 
        isOpen={createWorkoutOpen}
        onClose={() => setCreateWorkoutOpen(false)}
      />
    </div>
  );
};

export default WorkoutsPage;
