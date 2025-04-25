
export interface WorkoutSet {
  exerciseId: string;
  reps?: number;
  weight?: number;
  duration?: number; // in seconds
  distance?: number; // in meters
}

export interface WorkoutEntry {
  id: string;
  date: string;
  title: string;
  duration: number; // in minutes
  category: 'strength' | 'cardio' | 'flexibility' | 'balance' | 'mixed';
  sets: WorkoutSet[];
}

export const workoutHistory: WorkoutEntry[] = [
  {
    id: '1',
    date: '2025-04-23',
    title: 'Morning Strength Routine',
    duration: 45,
    category: 'strength',
    sets: [
      { exerciseId: '2', reps: 8, weight: 135 },
      { exerciseId: '2', reps: 8, weight: 145 },
      { exerciseId: '2', reps: 6, weight: 155 },
      { exerciseId: '1', reps: 10, weight: 185 },
      { exerciseId: '1', reps: 8, weight: 205 },
      { exerciseId: '1', reps: 8, weight: 225 },
      { exerciseId: '11', duration: 60 },
      { exerciseId: '11', duration: 60 },
      { exerciseId: '11', duration: 45 },
    ]
  },
  {
    id: '2',
    date: '2025-04-21',
    title: 'Cardio Session',
    duration: 30,
    category: 'cardio',
    sets: [
      { exerciseId: '6', duration: 1200, distance: 3000 },
      { exerciseId: '8', duration: 600 },
    ]
  },
  {
    id: '3',
    date: '2025-04-20',
    title: 'Full Body Workout',
    duration: 60,
    category: 'mixed',
    sets: [
      { exerciseId: '5', reps: 15 },
      { exerciseId: '5', reps: 15 },
      { exerciseId: '5', reps: 12 },
      { exerciseId: '4', reps: 8 },
      { exerciseId: '4', reps: 6 },
      { exerciseId: '3', reps: 5, weight: 225 },
      { exerciseId: '3', reps: 5, weight: 245 },
      { exerciseId: '7', duration: 600, distance: 5000 },
    ]
  },
  {
    id: '4',
    date: '2025-04-18',
    title: 'Recovery Day',
    duration: 25,
    category: 'flexibility',
    sets: [
      { exerciseId: '9', duration: 900 },
      { exerciseId: '10', duration: 300 },
    ]
  },
];
