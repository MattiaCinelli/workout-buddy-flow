
export interface Exercise {
  id: string;
  name: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'balance';
  muscleGroups: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const exerciseList: Exercise[] = [
  {
    id: '1',
    name: 'Barbell Squat',
    category: 'strength',
    muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings', 'Lower Back'],
    difficulty: 'intermediate',
  },
  {
    id: '2',
    name: 'Bench Press',
    category: 'strength',
    muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
    difficulty: 'intermediate',
  },
  {
    id: '3',
    name: 'Deadlift',
    category: 'strength',
    muscleGroups: ['Lower Back', 'Glutes', 'Hamstrings', 'Traps'],
    difficulty: 'advanced',
  },
  {
    id: '4',
    name: 'Pull-ups',
    category: 'strength',
    muscleGroups: ['Lats', 'Biceps', 'Middle Back'],
    difficulty: 'intermediate',
  },
  {
    id: '5',
    name: 'Push-ups',
    category: 'strength',
    muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
    difficulty: 'beginner',
  },
  {
    id: '6',
    name: 'Running',
    category: 'cardio',
    muscleGroups: ['Heart', 'Lungs', 'Full Body'],
    difficulty: 'beginner',
  },
  {
    id: '7',
    name: 'Cycling',
    category: 'cardio',
    muscleGroups: ['Quadriceps', 'Hamstrings', 'Calves', 'Heart'],
    difficulty: 'beginner',
  },
  {
    id: '8',
    name: 'Jumping Rope',
    category: 'cardio',
    muscleGroups: ['Calves', 'Shoulders', 'Heart', 'Lungs'],
    difficulty: 'beginner',
  },
  {
    id: '9',
    name: 'Yoga Flow',
    category: 'flexibility',
    muscleGroups: ['Full Body', 'Core'],
    difficulty: 'beginner',
  },
  {
    id: '10',
    name: 'Standing Hamstring Stretch',
    category: 'flexibility',
    muscleGroups: ['Hamstrings', 'Lower Back'],
    difficulty: 'beginner',
  },
  {
    id: '11',
    name: 'Plank',
    category: 'strength',
    muscleGroups: ['Core', 'Shoulders', 'Back'],
    difficulty: 'beginner',
  },
  {
    id: '12',
    name: 'Balance Board Exercise',
    category: 'balance',
    muscleGroups: ['Core', 'Lower Body'],
    difficulty: 'intermediate',
  }
];
