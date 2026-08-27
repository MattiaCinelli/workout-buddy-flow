import { describe, expect, it } from 'vitest';
import { isLiveRecord, toTombstone } from './softDelete';

describe('isLiveRecord', () => {
  it('keeps records without a deletedAt stamp', () => {
    expect(isLiveRecord({ id: 'a' })).toBe(true);
    expect(isLiveRecord({ id: 'a', deletedAt: undefined })).toBe(true);
  });

  it('rejects tombstoned records', () => {
    expect(isLiveRecord({ id: 'a', deletedAt: '2026-01-01T00:00:00.000Z' })).toBe(false);
  });

  it('filters a mixed list', () => {
    const list = [{ id: '1' }, { id: '2', deletedAt: '2026-01-01T00:00:00.000Z' }, { id: '3' }];
    expect(list.filter(isLiveRecord).map(r => r.id)).toEqual(['1', '3']);
  });
});

describe('toTombstone', () => {
  it('stamps deletedAt and updatedAt to the same instant, keeping other fields', () => {
    const result = toTombstone({ id: 'x', name: 'Bench', updatedAt: '2020-01-01T00:00:00.000Z' }, '2026-06-01T12:00:00.000Z');
    expect(result).toEqual({
      id: 'x', name: 'Bench', deletedAt: '2026-06-01T12:00:00.000Z', updatedAt: '2026-06-01T12:00:00.000Z',
    });
  });

  it('bumps updatedAt so the deletion wins last-write-wins against a stale copy', () => {
    const before = { id: 'x', updatedAt: '2020-01-01T00:00:00.000Z' };
    const after = toTombstone(before);
    expect(new Date(after.updatedAt!).getTime()).toBeGreaterThan(new Date(before.updatedAt!).getTime());
    expect(after.deletedAt).toBe(after.updatedAt);
  });
});
