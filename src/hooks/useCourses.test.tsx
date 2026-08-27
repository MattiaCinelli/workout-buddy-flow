/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import type { Course } from '@/data/courses';

const { db } = vi.hoisted(() => {
  const rows = new Map<string, Course>();
  return {
    db: {
      rows,
      getAll: async () => [...rows.values()].map(r => structuredClone(r)),
      save: async (c: Course) => { rows.set(c.id, structuredClone(c)); },
      remove: async (id: string) => { rows.delete(id); },
      bulkSave: async (cs: Course[]) => { for (const c of cs) rows.set(c.id, structuredClone(c)); },
    },
  };
});

vi.mock('@/lib/db', () => ({
  getAllCoursesFromDB: db.getAll,
  saveCourseToDB: db.save,
  deleteCourseFromDB: db.remove,
  bulkSaveCoursesToDB: db.bulkSave,
}));
vi.mock('@/lib/syncClient', () => ({ isConnected: () => false }));
// No seed data — start every test from a known-empty store.
vi.mock('@/data/courses', async (orig) => ({ ...(await orig<typeof import('@/data/courses')>()), defaultCourses: [] }));

import { useCourses } from './useCourses';

const item = (over: Partial<Course['workouts'][number]>): Course['workouts'][number] => ({
  id: over.id ?? crypto.randomUUID(),
  type: 'workout',
  workoutId: 'w',
  order: 0,
  week: 1,
  day: 1,
  completed: false,
  ...over,
});

const makeCourse = (over: Partial<Course>): Course => ({
  id: crypto.randomUUID(),
  title: 'Course',
  workouts: [],
  createdAt: new Date().toISOString(),
  durationWeeks: 1,
  ...over,
});

const mountCourses = async () => {
  const view = renderHook(() => useCourses());
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
};

beforeEach(() => db.rows.clear());
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('useCourses', () => {
  it('sorts courses newest-first and backfills item week/day/type', async () => {
    db.rows.set('old', makeCourse({ id: 'old', title: 'Older', createdAt: '2026-01-01T00:00:00.000Z',
      workouts: [{ id: 'i1', workoutId: 'w', order: 0, completed: false } as Course['workouts'][number]] }));
    db.rows.set('new', makeCourse({ id: 'new', title: 'Newer', createdAt: '2026-06-01T00:00:00.000Z' }));

    const { result } = await mountCourses();

    expect(result.current.courses.map(c => c.title)).toEqual(['Newer', 'Older']);
    const migratedItem = result.current.courses.find(c => c.id === 'old')!.workouts[0];
    expect(migratedItem).toMatchObject({ week: 1, day: 1, type: 'workout' });
  });

  it('getNextWorkoutInCourse returns the first uncompleted item by order', async () => {
    db.rows.set('c', makeCourse({ id: 'c', workouts: [
      item({ id: 'a', order: 2, completed: false }),
      item({ id: 'b', order: 0, completed: true }),
      item({ id: 'd', order: 1, completed: false }),
    ] }));
    const { result } = await mountCourses();
    expect(result.current.getNextWorkoutInCourse('c')?.id).toBe('d');
  });

  it('getCourseProgress is the completed percentage, rounded', async () => {
    db.rows.set('c', makeCourse({ id: 'c', workouts: [
      item({ id: 'a', completed: true }), item({ id: 'b', completed: true }), item({ id: 'd', completed: false }),
    ] }));
    const { result } = await mountCourses();
    expect(result.current.getCourseProgress('c')).toBe(67);
  });

  it('completing the last item stamps the course completedAt', async () => {
    db.rows.set('c', makeCourse({ id: 'c', workouts: [
      item({ id: 'a', completed: true }), item({ id: 'b', completed: false }),
    ] }));
    const { result } = await mountCourses();

    await act(async () => { await result.current.completeWorkoutInCourse('c', 'b'); });

    const course = result.current.courses.find(c => c.id === 'c')!;
    expect(course.workouts.every(w => w.completed)).toBe(true);
    expect(course.completedAt).toEqual(expect.any(String));
  });

  it('completing a non-final item leaves completedAt unset', async () => {
    db.rows.set('c', makeCourse({ id: 'c', workouts: [
      item({ id: 'a', completed: false }), item({ id: 'b', completed: false }),
    ] }));
    const { result } = await mountCourses();

    await act(async () => { await result.current.completeWorkoutInCourse('c', 'a'); });

    expect(result.current.courses.find(c => c.id === 'c')!.completedAt).toBeUndefined();
  });

  it('restartCourse clears every completion and re-stamps startedAt', async () => {
    db.rows.set('c', makeCourse({ id: 'c', completedAt: '2026-01-02T00:00:00.000Z', workouts: [
      item({ id: 'a', completed: true, completedAt: '2026-01-01T00:00:00.000Z' }),
      item({ id: 'b', completed: true, completedAt: '2026-01-01T00:00:00.000Z' }),
    ] }));
    const { result } = await mountCourses();

    await act(async () => { await result.current.restartCourse('c'); });

    const course = result.current.courses.find(c => c.id === 'c')!;
    expect(course.workouts.some(w => w.completed)).toBe(false);
    expect(course.completedAt).toBeUndefined();
    expect(course.startedAt).toEqual(expect.any(String));
  });

  it('uncompleteWorkoutInCourse reopens one item and clears course completedAt', async () => {
    db.rows.set('c', makeCourse({ id: 'c', completedAt: '2026-02-02T00:00:00.000Z', workouts: [
      item({ id: 'a', completed: true }), item({ id: 'b', completed: true }),
    ] }));
    const { result } = await mountCourses();

    await act(async () => { await result.current.uncompleteWorkoutInCourse('c', 'a'); });

    const course = result.current.courses.find(c => c.id === 'c')!;
    expect(course.workouts.find(w => w.id === 'a')!.completed).toBe(false);
    expect(course.completedAt).toBeUndefined();
  });

  it('course operations return null for an unknown id', async () => {
    const { result } = await mountCourses();
    expect(result.current.getNextWorkoutInCourse('nope')).toBeNull();
    await act(async () => {
      expect(await result.current.completeWorkoutInCourse('nope', 'x')).toBeNull();
      expect(await result.current.restartCourse('nope')).toBeNull();
    });
  });
});
