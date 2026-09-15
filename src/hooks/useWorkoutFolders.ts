import { useEffect, useState } from 'react';
const KEY = 'workout-buddy-workout-folders';
const EVENT = 'workout-buddy-workout-folders-changed';
export const FOLDER_SEPARATOR = ' / ';
export const folderName = (path: string) => path.split(FOLDER_SEPARATOR).at(-1) ?? path;
export const parentFolder = (path: string) => { const parts = path.split(FOLDER_SEPARATOR); return parts.length > 1 ? parts.slice(0, -1).join(FOLDER_SEPARATOR) : undefined; };
export const childFolderPath = (parent: string | undefined, name: string) => parent ? `${parent}${FOLDER_SEPARATOR}${name.trim()}` : name.trim();
export const isFolderOrDescendant = (path: string, ancestor: string) => path === ancestor || path.startsWith(`${ancestor}${FOLDER_SEPARATOR}`);
export const rebaseFolderPath = (path: string, source: string, targetParent?: string) => {
  const suffix = path.slice(source.length);
  return `${targetParent ? `${targetParent}${FOLDER_SEPARATOR}` : ''}${folderName(source)}${suffix}`;
};
const read = (): string[] => { try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
const write = (folders: string[]) => { localStorage.setItem(KEY, JSON.stringify(Array.from(new Set(folders.map(folder => folder.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)))); window.dispatchEvent(new Event(EVENT)); };
export const useWorkoutFolders = (workoutFolders: Array<string | undefined> = []) => {
  const [stored, setStored] = useState(read);
  useEffect(() => { const refresh = () => setStored(read()); window.addEventListener(EVENT, refresh); return () => window.removeEventListener(EVENT, refresh); }, []);
  const folders = Array.from(new Set([...stored, ...workoutFolders.filter((folder): folder is string => !!folder)])).sort((a, b) => a.localeCompare(b));
  return {
    folders,
    addFolder: (name: string) => write([...folders, name]),
    renameFolder: (path: string, name: string) => {
      const renamed = childFolderPath(parentFolder(path), name);
      write(folders.map(folder => isFolderOrDescendant(folder, path) ? `${renamed}${folder.slice(path.length)}` : folder));
    },
    moveFolder: (path: string, targetParent?: string) => write(folders.map(folder => isFolderOrDescendant(folder, path) ? rebaseFolderPath(folder, path, targetParent) : folder)),
    deleteFolder: (path: string) => write(folders.filter(folder => !isFolderOrDescendant(folder, path))),
  };
};
