import { useEffect, useState } from 'react';
import {
  readWorkoutFolders,
  WORKOUT_FOLDERS_CHANGE_EVENT,
  writeWorkoutFolders,
} from '@/lib/workoutFolders';
export const FOLDER_SEPARATOR = ' / ';
export const folderName = (path: string) => path.split(FOLDER_SEPARATOR).at(-1) ?? path;
export const parentFolder = (path: string) => { const parts = path.split(FOLDER_SEPARATOR); return parts.length > 1 ? parts.slice(0, -1).join(FOLDER_SEPARATOR) : undefined; };
export const childFolderPath = (parent: string | undefined, name: string) => parent ? `${parent}${FOLDER_SEPARATOR}${name.trim()}` : name.trim();
export const isFolderOrDescendant = (path: string, ancestor: string) => path === ancestor || path.startsWith(`${ancestor}${FOLDER_SEPARATOR}`);
export const rebaseFolderPath = (path: string, source: string, targetParent?: string) => {
  const suffix = path.slice(source.length);
  return `${targetParent ? `${targetParent}${FOLDER_SEPARATOR}` : ''}${folderName(source)}${suffix}`;
};
export const useWorkoutFolders = (workoutFolders: Array<string | undefined> = []) => {
  const [stored, setStored] = useState(readWorkoutFolders);
  useEffect(() => { const refresh = () => setStored(readWorkoutFolders()); window.addEventListener(WORKOUT_FOLDERS_CHANGE_EVENT, refresh); return () => window.removeEventListener(WORKOUT_FOLDERS_CHANGE_EVENT, refresh); }, []);
  const folders = Array.from(new Set([...stored, ...workoutFolders.filter((folder): folder is string => !!folder)])).sort((a, b) => a.localeCompare(b));
  return {
    folders,
    addFolder: (name: string) => writeWorkoutFolders([...folders, name]),
    renameFolder: (path: string, name: string) => {
      const renamed = childFolderPath(parentFolder(path), name);
      writeWorkoutFolders(folders.map(folder => isFolderOrDescendant(folder, path) ? `${renamed}${folder.slice(path.length)}` : folder));
    },
    moveFolder: (path: string, targetParent?: string) => writeWorkoutFolders(folders.map(folder => isFolderOrDescendant(folder, path) ? rebaseFolderPath(folder, path, targetParent) : folder)),
    deleteFolder: (path: string) => writeWorkoutFolders(folders.filter(folder => !isFolderOrDescendant(folder, path))),
  };
};
