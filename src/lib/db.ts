import { openDB, IDBPDatabase } from 'idb';
import { Exercise } from '@/data/exercises';
import { WorkoutEntry } from '@/data/workoutHistory';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';

const DB_NAME = 'workout-buddy-db';
const DB_VERSION = 2; // Bump version for new store

export interface WorkoutBuddyDB {
  exercises: Exercise;
  workouts: WorkoutEntry;
  scheduledWorkouts: ScheduledWorkout;
}

let dbPromise: Promise<IDBPDatabase<WorkoutBuddyDB>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<WorkoutBuddyDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Create exercises store
        if (!db.objectStoreNames.contains('exercises')) {
          db.createObjectStore('exercises', { keyPath: 'id' });
        }
        // Create workouts store
        if (!db.objectStoreNames.contains('workouts')) {
          db.createObjectStore('workouts', { keyPath: 'id' });
        }
        // Create scheduled workouts store (added in v2)
        if (!db.objectStoreNames.contains('scheduledWorkouts')) {
          db.createObjectStore('scheduledWorkouts', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

// Exercise operations
export const getAllExercisesFromDB = async (): Promise<Exercise[]> => {
  const db = await getDB();
  return db.getAll('exercises');
};

export const getExerciseByIdFromDB = async (id: string): Promise<Exercise | undefined> => {
  const db = await getDB();
  return db.get('exercises', id);
};

export const saveExerciseToDB = async (exercise: Exercise): Promise<void> => {
  const db = await getDB();
  await db.put('exercises', exercise);
};

export const deleteExerciseFromDB = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('exercises', id);
};

export const bulkSaveExercisesToDB = async (exercises: Exercise[]): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction('exercises', 'readwrite');
  await Promise.all([
    ...exercises.map(exercise => tx.store.put(exercise)),
    tx.done
  ]);
};

// Workout operations
export const getAllWorkoutsFromDB = async (): Promise<WorkoutEntry[]> => {
  const db = await getDB();
  return db.getAll('workouts');
};

export const getWorkoutByIdFromDB = async (id: string): Promise<WorkoutEntry | undefined> => {
  const db = await getDB();
  return db.get('workouts', id);
};

export const saveWorkoutToDB = async (workout: WorkoutEntry): Promise<void> => {
  const db = await getDB();
  await db.put('workouts', workout);
};

export const deleteWorkoutFromDB = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('workouts', id);
};

export const bulkSaveWorkoutsToDB = async (workouts: WorkoutEntry[]): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction('workouts', 'readwrite');
  await Promise.all([
    ...workouts.map(workout => tx.store.put(workout)),
    tx.done
  ]);
};

// Scheduled Workout operations
export const getAllScheduledWorkoutsFromDB = async (): Promise<ScheduledWorkout[]> => {
  const db = await getDB();
  return db.getAll('scheduledWorkouts');
};

export const getScheduledWorkoutByIdFromDB = async (id: string): Promise<ScheduledWorkout | undefined> => {
  const db = await getDB();
  return db.get('scheduledWorkouts', id);
};

export const saveScheduledWorkoutToDB = async (scheduledWorkout: ScheduledWorkout): Promise<void> => {
  const db = await getDB();
  await db.put('scheduledWorkouts', scheduledWorkout);
};

export const deleteScheduledWorkoutFromDB = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('scheduledWorkouts', id);
};

export const bulkSaveScheduledWorkoutsToDB = async (scheduledWorkouts: ScheduledWorkout[]): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction('scheduledWorkouts', 'readwrite');
  await Promise.all([
    ...scheduledWorkouts.map(sw => tx.store.put(sw)),
    tx.done
  ]);
};

// Initialize database with default data if empty
export const initializeDB = async (
  defaultExercises: Exercise[], 
  defaultWorkouts: WorkoutEntry[]
): Promise<{ exercises: Exercise[]; workouts: WorkoutEntry[] }> => {
  const db = await getDB();
  
  // Check if exercises exist
  const existingExercises = await db.getAll('exercises');
  if (existingExercises.length === 0) {
    await bulkSaveExercisesToDB(defaultExercises);
  }
  
  // Check if workouts exist
  const existingWorkouts = await db.getAll('workouts');
  if (existingWorkouts.length === 0) {
    await bulkSaveWorkoutsToDB(defaultWorkouts);
  }
  
  // Return current state
  const exercises = existingExercises.length > 0 ? existingExercises : defaultExercises;
  const workouts = existingWorkouts.length > 0 ? existingWorkouts : defaultWorkouts;
  
  return { exercises, workouts };
};
