import { useState, type DragEvent } from 'react';
import { ArrowLeft, ChevronRight, Folder, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import WorkoutCard from '@/components/WorkoutCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useData } from '@/contexts/DataContext';
import { workoutContainsExerciseQuery } from '@/lib/workoutSearch';
import { childFolderPath, FOLDER_SEPARATOR, folderName as leafName, isFolderOrDescendant, parentFolder, rebaseFolderPath, useWorkoutFolders } from '@/hooks/useWorkoutFolders';

const WorkoutFolder = () => {
  const { folderName = '' } = useParams<{ folderName: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [newSubfolder, setNewSubfolder] = useState('');
  const { workouts, exercises, updateWorkout } = useData();
  const { folders, addFolder, moveFolder } = useWorkoutFolders(workouts.map(workout => workout.folder));
  const children = folders.filter(folder => parentFolder(folder) === folderName);
  const parent = parentFolder(folderName);
  const visible = workouts.filter(workout => workout.folder === folderName && (workout.title.toLowerCase().includes(search.toLowerCase()) || workoutContainsExerciseQuery(workout, exercises, search)));
  const breadcrumbs = folderName.split(FOLDER_SEPARATOR).map((name, index, parts) => ({ name, path: parts.slice(0, index + 1).join(FOLDER_SEPARATOR) }));
  const moveTree = async (source: string, target?: string) => {
    if (source === target || (target && isFolderOrDescendant(target, source))) return;
    await Promise.all(workouts.filter(workout => workout.folder && isFolderOrDescendant(workout.folder, source)).map(workout => updateWorkout(workout.id, { folder: rebaseFolderPath(workout.folder!, source, target) })));
    moveFolder(source, target);
  };
  const drop = (event: DragEvent, target?: string) => { event.preventDefault(); event.stopPropagation(); const workoutId = event.dataTransfer.getData('text/workout-id'); const draggedFolder = event.dataTransfer.getData('text/workout-folder'); if (workoutId) void updateWorkout(workoutId, { folder: target }); else if (draggedFolder) void moveTree(draggedFolder, target); };

  return <div className="min-h-screen bg-background"><Navbar /><main className="app-page">
    <div className="page-heading"><div className="page-heading__main"><Button variant="ghost" size="icon" onClick={() => navigate(parent ? `/workouts/folders/${encodeURIComponent(parent)}` : '/workouts')} aria-label="Back"><ArrowLeft /></Button><div className="page-heading__icon"><Folder /></div><div><h1 className="page-title">{leafName(folderName)}</h1><p className="page-subtitle">{visible.length} workouts · {children.length} subfolders</p></div></div></div>
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm" aria-label="Folder breadcrumbs"><button onClick={() => navigate('/workouts')}>My Workouts</button>{breadcrumbs.map(crumb => <span key={crumb.path} className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /><button className={crumb.path === folderName ? 'font-semibold' : 'text-muted-foreground'} onClick={() => navigate(`/workouts/folders/${encodeURIComponent(crumb.path)}`)}>{crumb.name}</button></span>)}</nav>
    <div className="surface-panel mb-6 flex flex-col gap-2 p-3 sm:flex-row"><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search this folder..." /><Input value={newSubfolder} onChange={e => setNewSubfolder(e.target.value)} placeholder="New subfolder name" /><Button variant="outline" disabled={!newSubfolder.trim()} onClick={() => { addFolder(childFolderPath(folderName, newSubfolder)); setNewSubfolder(''); }}><Plus className="mr-1 h-4 w-4" />Create subfolder</Button></div>
    {!!children.length && <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children.map(child => <div key={child} draggable onDragStart={e => e.dataTransfer.setData('text/workout-folder', child)} onDragOver={e => e.preventDefault()} onDrop={e => drop(e, child)} className="cursor-grab rounded-xl border-2 border-dashed border-primary/25 bg-primary/5 p-4"><button className="flex w-full items-center gap-3 text-left" onClick={() => navigate(`/workouts/folders/${encodeURIComponent(child)}`)}><Folder className="h-7 w-7 text-primary" /><span className="flex-1 font-semibold">{leafName(child)}</span><ChevronRight /></button></div>)}</div>}
    <div className="mb-6 flex gap-2 overflow-x-auto" aria-label="Folder drop targets"><button className="shrink-0 rounded-lg border border-dashed px-4 py-2" onDragOver={e => e.preventDefault()} onDrop={e => drop(e, parent)}>{parent ? 'Move to parent folder' : 'Move out of folder'}</button>{folders.filter(folder => folder !== folderName && !isFolderOrDescendant(folder, folderName)).map(folder => <button key={folder} className="shrink-0 rounded-lg border border-dashed px-4 py-2" onDragOver={e => e.preventDefault()} onDrop={e => drop(e, folder)}>{leafName(folder)}</button>)}</div>
    {visible.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{visible.map(workout => <div key={workout.id} draggable onDragStart={e => e.dataTransfer.setData('text/workout-id', workout.id)} className="cursor-grab"><WorkoutCard workout={workout} onToggleFavorite={item => updateWorkout(item.id, { favorite: !item.favorite })} /></div>)}</div> : <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">This folder has no matching workouts.</div>}
  </main></div>;
};
export default WorkoutFolder;
