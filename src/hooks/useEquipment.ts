import { useEffect, useState } from 'react';
import { DEFAULT_EQUIPMENT } from '@/data/exercises';
const KEY = 'workout-buddy-equipment-options';
const EVENT = 'workout-buddy-equipment-changed';
const read = (): string[] => { try { const value = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(value) ? value : [...DEFAULT_EQUIPMENT]; } catch { return [...DEFAULT_EQUIPMENT]; } };
const write = (value: string[]) => { localStorage.setItem(KEY, JSON.stringify(value)); window.dispatchEvent(new Event(EVENT)); };
export const useEquipment = () => {
  const [equipment, setEquipment] = useState(read);
  useEffect(() => { const refresh = () => setEquipment(read()); window.addEventListener(EVENT, refresh); return () => window.removeEventListener(EVENT, refresh); }, []);
  return { equipment, addEquipment: (name: string) => write([...equipment, name]), renameEquipment: (old: string, name: string) => write(equipment.map(item => item === old ? name : item)), deleteEquipment: (name: string) => write(equipment.filter(item => item !== name)) };
};
