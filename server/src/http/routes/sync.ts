import { FastifyInstance } from 'fastify';
import { registerSyncCollection } from '../syncRoute';
import * as exercises from '../../db/exercises';
import * as workouts from '../../db/workouts';
import * as scheduledWorkouts from '../../db/scheduledWorkouts';
import * as courses from '../../db/courses';
import * as workoutSessions from '../../db/workoutSessions';
import * as muscleGroups from '../../db/muscleGroups';

const workoutSetSchema = {
  type: 'object',
  required: ['exerciseId'],
  properties: {
    exerciseId: { type: 'string' },
    reps: { type: 'number' },
    weight: { type: 'number' },
    duration: { type: 'number' },
    distance: { type: 'number' },
    restAfter: { type: 'number' },
  },
};

const exerciseSchema = {
  type: 'object',
  required: ['id', 'name', 'category', 'muscleGroups', 'difficulty', 'updatedAt'],
  properties: {
    id: { type: 'string', minLength: 1 },
    name: { type: 'string' },
    category: { type: 'string' },
    muscleGroups: { type: 'array', items: { type: 'string' } },
    difficulty: { type: 'string' },
    logType: { type: 'string' },
    defaultSets: { type: 'number' },
    defaultReps: { type: 'number' },
    defaultDuration: { type: 'number' },
    defaultWeight: { type: 'number' },
    defaultDistance: { type: 'number' },
    secondsPerRep: { type: 'number' },
    instructions: { type: 'string' },
    imageUrl: { type: 'string' },
    updatedAt: { type: 'string' },
    deletedAt: { type: 'string' },
  },
};

const workoutSchema = {
  type: 'object',
  required: ['id', 'date', 'title', 'duration', 'category', 'sets', 'updatedAt'],
  properties: {
    id: { type: 'string', minLength: 1 },
    date: { type: 'string' },
    title: { type: 'string' },
    duration: { type: 'number' },
    category: { type: 'string' },
    description: { type: 'string' },
    sets: { type: 'array', items: workoutSetSchema },
    restBetweenExercises: { type: 'number' },
    notes: { type: 'string' },
    updatedAt: { type: 'string' },
    deletedAt: { type: 'string' },
  },
};

const scheduledWorkoutSchema = {
  type: 'object',
  required: ['id', 'workoutId', 'startDate', 'startTime', 'recurrence', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', minLength: 1 },
    workoutId: { type: 'string' },
    startDate: { type: 'string' },
    startTime: { type: 'string' },
    endTime: { type: 'string' },
    recurrence: { type: 'string' },
    recurrenceDays: { type: 'array', items: { type: 'string' } },
    endRecurrenceDate: { type: 'string' },
    notes: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    deletedAt: { type: 'string' },
  },
};

const courseWorkoutSchema = {
  type: 'object',
  required: ['id', 'type', 'order', 'week', 'day', 'completed'],
  properties: {
    id: { type: 'string' },
    type: { type: 'string' },
    workoutId: { type: 'string' },
    order: { type: 'number' },
    week: { type: 'number' },
    day: { type: 'number' },
    title: { type: 'string' },
    instructions: { type: 'string' },
    completed: { type: 'boolean' },
    completedAt: { type: 'string' },
  },
};

const courseSchema = {
  type: 'object',
  required: ['id', 'title', 'workouts', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string' },
    description: { type: 'string' },
    goal: { type: 'string' },
    difficulty: { type: 'string' },
    prerequisites: { type: 'string' },
    durationWeeks: { type: 'number' },
    workouts: { type: 'array', items: courseWorkoutSchema },
    createdAt: { type: 'string' },
    startedAt: { type: 'string' },
    completedAt: { type: 'string' },
    updatedAt: { type: 'string' },
    deletedAt: { type: 'string' },
  },
};

const workoutSetResultSchema = {
  type: 'object',
  required: ['exerciseId', 'setIndex', 'completed'],
  properties: {
    exerciseId: { type: 'string' },
    setIndex: { type: 'number' },
    completed: { type: 'boolean' },
    reps: { type: 'number' },
    weight: { type: 'number' },
    duration: { type: 'number' },
    distance: { type: 'number' },
  },
};

const workoutSessionSchema = {
  type: 'object',
  required: ['id', 'workoutId', 'date', 'title', 'duration', 'category', 'sets', 'completedAt', 'plannedDuration', 'updatedAt'],
  properties: {
    id: { type: 'string', minLength: 1 },
    workoutId: { type: 'string' },
    date: { type: 'string' },
    title: { type: 'string' },
    duration: { type: 'number' },
    category: { type: 'string' },
    sets: { type: 'array', items: workoutSetSchema },
    restBetweenExercises: { type: 'number' },
    notes: { type: 'string' },
    completedAt: { type: 'string' },
    plannedDuration: { type: 'number' },
    courseId: { type: 'string' },
    courseItemId: { type: 'string' },
    scheduledWorkoutId: { type: 'string' },
    actualSets: { type: 'array', items: workoutSetResultSchema },
    perceivedExertion: { type: 'number' },
    completionNotes: { type: 'string' },
    updatedAt: { type: 'string' },
    deletedAt: { type: 'string' },
  },
};

const muscleGroupSchema = {
  type: 'object',
  required: ['id', 'name', 'updatedAt'],
  properties: {
    id: { type: 'string', minLength: 1 },
    name: { type: 'string' },
    updatedAt: { type: 'string' },
    deletedAt: { type: 'string' },
  },
};

export const registerSyncRoutes = (app: FastifyInstance) => {
  registerSyncCollection(app, {
    path: 'exercises',
    listChangedSince: exercises.listChangedSince,
    upsertBatch: exercises.upsertExercisesBatch,
    itemSchema: exerciseSchema,
  });

  registerSyncCollection(app, {
    path: 'workouts',
    listChangedSince: workouts.listChangedSince,
    upsertBatch: workouts.upsertWorkoutsBatch,
    itemSchema: workoutSchema,
  });

  registerSyncCollection(app, {
    path: 'scheduledWorkouts',
    listChangedSince: scheduledWorkouts.listChangedSince,
    upsertBatch: scheduledWorkouts.upsertScheduledWorkoutsBatch,
    itemSchema: scheduledWorkoutSchema,
  });

  registerSyncCollection(app, {
    path: 'courses',
    listChangedSince: courses.listChangedSince,
    upsertBatch: courses.upsertCoursesBatch,
    itemSchema: courseSchema,
  });

  registerSyncCollection(app, {
    path: 'workoutSessions',
    listChangedSince: workoutSessions.listChangedSince,
    upsertBatch: workoutSessions.upsertWorkoutSessionsBatch,
    itemSchema: workoutSessionSchema,
  });

  registerSyncCollection(app, {
    path: 'muscleGroups',
    listChangedSince: muscleGroups.listChangedSince,
    upsertBatch: muscleGroups.upsertMuscleGroupsBatch,
    itemSchema: muscleGroupSchema,
  });
};
