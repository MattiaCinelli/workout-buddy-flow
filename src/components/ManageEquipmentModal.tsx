import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEquipment } from '@/hooks/useEquipment';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';
export const ManageEquipmentModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { equipment, addEquipment, renameEquipment, deleteEquipment } = useEquipment(); const { exercises, updateExercise } = useData();
  const [newName, setNewName] = useState(''); const [editing, setEditing] = useState<string | null>(null); const [editName, setEditName] = useState('');
  const taken = (name: string, except?: string) => equipment.some(item => item !== except && item.toLowerCase() === name.toLowerCase());
  const add = () => { const name = newName.trim(); if (!name || taken(name)) return void toast.error(name ? `"${name}" already exists` : 'Enter an equipment name'); addEquipment(name); setNewName(''); };
  const rename = async () => { if (!editing) return; const name = editName.trim(); if (!name || taken(name, editing)) return void toast.error('Choose a unique equipment name'); await Promise.all(exercises.filter(ex => ex.equipment?.includes(editing)).map(ex => updateExercise(ex.id, { equipment: ex.equipment?.map(item => item === editing ? name : item) }))); renameEquipment(editing, name); setEditing(null); };
  const remove = async (name: string) => { await Promise.all(exercises.filter(ex => ex.equipment?.includes(name)).map(ex => updateExercise(ex.id, { equipment: ex.equipment?.filter(item => item !== name) }))); deleteEquipment(name); };
  return <Dialog open={isOpen} onOpenChange={open => !open && onClose()}><DialogContent className="sm:max-w-[420px] max-h-[85vh] flex flex-col"><DialogHeader><DialogTitle>Manage Equipment</DialogTitle><DialogDescription>Add, rename, or remove equipment. Removing one only untags exercises.</DialogDescription></DialogHeader><div className="flex gap-2"><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New equipment…" /><Button onClick={add}><Plus /></Button></div><div className="overflow-y-auto">{equipment.map(item => <div key={item} className="flex items-center gap-2 rounded-md p-2 hover:bg-muted">{editing === item ? <><Input value={editName} onChange={e => setEditName(e.target.value)} /><Button size="icon" variant="ghost" onClick={() => void rename()}><Check /></Button><Button size="icon" variant="ghost" onClick={() => setEditing(null)}><X /></Button></> : <><span className="flex-1">{item}</span><span className="text-xs text-muted-foreground">{exercises.filter(ex => ex.equipment?.includes(item)).length || ''}</span><Button size="icon" variant="ghost" aria-label={`Rename ${item}`} onClick={() => { setEditing(item); setEditName(item); }}><Pencil /></Button><Button size="icon" variant="ghost" aria-label={`Delete ${item}`} onClick={() => void remove(item)}><Trash2 /></Button></>}</div>)}</div></DialogContent></Dialog>;
};
