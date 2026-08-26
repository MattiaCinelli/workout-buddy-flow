import { describe, expect, it, beforeEach, vi } from 'vitest';
import { getNotificationSettings, setNotificationSettings } from './notificationSettings';

// The default vitest "node" environment doesn't ship a working localStorage
// (Node's own global is incomplete here — .clear isn't even a function), so
// this module's only real dependency needs a minimal in-memory stand-in.
const createLocalStorageStub = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
  };
};

describe('notificationSettings', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageStub());
  });

  it('defaults to enabled with no lead time when nothing is stored', () => {
    expect(getNotificationSettings()).toEqual({ enabled: true, leadMinutes: 0 });
  });

  it('round-trips a saved setting', () => {
    setNotificationSettings({ enabled: false, leadMinutes: 15 });
    expect(getNotificationSettings()).toEqual({ enabled: false, leadMinutes: 15 });
  });

  it('falls back to defaults when the stored value is corrupted', () => {
    localStorage.setItem('workout-buddy-notification-settings', '{not json');
    expect(getNotificationSettings()).toEqual({ enabled: true, leadMinutes: 0 });
  });
});
