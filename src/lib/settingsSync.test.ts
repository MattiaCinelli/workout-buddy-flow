import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyRemoteSettings, clearSettingsSnapshot, collectLocalSettings, getSettingsSnapshot,
  isPristineSettings, serializeSettings, setSettingsSnapshot, type SyncableSettings,
} from './settingsSync';

const createLocalStorageStub = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
  };
};

beforeEach(() => {
  vi.stubGlobal('localStorage', createLocalStorageStub());
  // applyRemoteSettings dispatches change events; a no-op window is enough.
  vi.stubGlobal('window', { dispatchEvent: () => true });
  vi.stubGlobal('CustomEvent', class { constructor(public type: string, public init?: unknown) {} });
});

describe('serializeSettings', () => {
  it('is stable regardless of key order', () => {
    const a = { theme: 'dark', accessibility: { haptics: true, textSize: 'large' }, bodyProfile: { heightCm: 180 } };
    const b = { bodyProfile: { heightCm: 180 }, accessibility: { textSize: 'large', haptics: true }, theme: 'dark' };
    expect(serializeSettings(a as unknown as SyncableSettings))
      .toBe(serializeSettings(b as unknown as SyncableSettings));
  });

  it('changes when any value changes', () => {
    const base = collectLocalSettings();
    const changed = { ...base, theme: base.theme === 'dark' ? 'light' : 'dark' } as SyncableSettings;
    expect(serializeSettings(base)).not.toBe(serializeSettings(changed));
  });

  it('omits undefined-valued keys, matching JSON.stringify', () => {
    // getBodyProfile() returns { heightCm: undefined } when no height is
    // set — that must serialise the same as a bare {}.
    const withUndefined = { theme: 'system', accessibility: {}, bodyProfile: { heightCm: undefined } };
    const without = { theme: 'system', accessibility: {}, bodyProfile: {} };
    expect(serializeSettings(withUndefined as unknown as SyncableSettings))
      .toBe(serializeSettings(without as unknown as SyncableSettings));
  });
});

describe('isPristineSettings', () => {
  it('is true for a freshly collected default set (incl. unset height)', () => {
    expect(isPristineSettings(collectLocalSettings())).toBe(true);
  });

  it('is false once any preference is changed', () => {
    const modified = collectLocalSettings();
    modified.theme = 'dark';
    expect(isPristineSettings(modified)).toBe(false);

    const withHeight = collectLocalSettings();
    withHeight.bodyProfile = { heightCm: 180 };
    expect(isPristineSettings(withHeight)).toBe(false);
  });
});

describe('collect / apply round-trip', () => {
  it('applies a remote blob into local storage so a fresh collect matches', () => {
    const remote: SyncableSettings = {
      theme: 'dark',
      accessibility: {
        textSize: 'large', motion: 'reduced', haptics: false, voiceCues: false,
        backgroundMusic: true, musicVolume: 0.8,
      },
      bodyProfile: { heightCm: 175 },
    };

    applyRemoteSettings(remote);

    expect(collectLocalSettings()).toEqual(remote);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('drops an invalid height rather than storing it', () => {
    applyRemoteSettings({
      theme: 'system',
      accessibility: collectLocalSettings().accessibility,
      bodyProfile: { heightCm: -5 },
    });
    expect(collectLocalSettings().bodyProfile.heightCm).toBeUndefined();
  });

  it('ignores an unrecognised theme value', () => {
    localStorage.setItem('theme', 'light');
    applyRemoteSettings({
      theme: 'neon' as unknown as SyncableSettings['theme'],
      accessibility: collectLocalSettings().accessibility,
      bodyProfile: {},
    });
    expect(localStorage.getItem('theme')).toBe('light');
  });
});

describe('settings snapshot', () => {
  it('round-trips and clears', () => {
    expect(getSettingsSnapshot()).toBeNull();
    setSettingsSnapshot({ json: '{"x":1}', updatedAt: '2026-01-01T00:00:00.000Z' });
    expect(getSettingsSnapshot()).toEqual({ json: '{"x":1}', updatedAt: '2026-01-01T00:00:00.000Z' });
    clearSettingsSnapshot();
    expect(getSettingsSnapshot()).toBeNull();
  });

  it('returns null on malformed JSON instead of throwing', () => {
    localStorage.setItem('workout-buddy-sync:settings:snapshot', '{not json');
    expect(getSettingsSnapshot()).toBeNull();
  });
});
