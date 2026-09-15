/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { childFolderPath, isFolderOrDescendant, parentFolder, rebaseFolderPath, useWorkoutFolders } from './useWorkoutFolders';

describe('useWorkoutFolders', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('creates, renames and removes folders while retaining names found on workouts', () => {
    const { result, rerender } = renderHook(({ assigned }) => useWorkoutFolders(assigned), { initialProps: { assigned: ['Existing'] as Array<string | undefined> } });
    act(() => result.current.addFolder('Hamstring V2'));
    expect(result.current.folders).toEqual(['Existing', 'Hamstring V2']);
    act(() => result.current.renameFolder('Hamstring V2', 'Mobility'));
    expect(result.current.folders).toEqual(['Existing', 'Mobility']);
    act(() => result.current.deleteFolder('Mobility'));
    rerender({ assigned: ['Existing'] });
    expect(result.current.folders).toEqual(['Existing']);
  });
});

describe('workout folder hierarchy', () => {
  it('builds parent/child paths and safely rebases a whole subtree', () => {
    expect(childFolderPath('Hamstring', 'Week 1')).toBe('Hamstring / Week 1');
    expect(parentFolder('Hamstring / Week 1')).toBe('Hamstring');
    expect(isFolderOrDescendant('Hamstring / Week 1 / Day 1', 'Hamstring')).toBe(true);
    expect(rebaseFolderPath('Hamstring / Week 1 / Day 1', 'Hamstring / Week 1', 'Mobility')).toBe('Mobility / Week 1 / Day 1');
  });
});
