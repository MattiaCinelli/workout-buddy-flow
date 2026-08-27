import {
  ACCESSIBILITY_DEFAULTS, getAccessibilitySettings, setAccessibilitySettings, type AccessibilitySettings,
} from './accessibilitySettings';
import { getBodyProfile, setBodyProfile, type BodyProfile } from './bodyProfile';
import type { Theme } from '@/hooks/useTheme';

// Account-level preferences that sync across a user's devices, as one blob
// (not a collection — there's exactly one set per account). The transport
// and last-write-wins live in syncClient.ts; this module is just the
// read/apply/serialize helpers plus the local "last synced" snapshot.
//
// Deliberately NOT synced: the custom workout-audio *file* (a multi-MB blob
// in its own IndexedDB, per-device on purpose) and notification/reminder
// settings (device-centric — reminders only fire on the phone you carry —
// and applying them needs a re-schedule pass this doesn't do yet).

// Must match the private constants in src/hooks/useTheme.ts — the theme is
// stored as a bare string under this key, and useTheme re-reads it when it
// sees this event.
const THEME_KEY = 'theme';
const THEME_CHANGE_EVENT = 'workout-buddy-theme-change';

export interface SyncableSettings {
  theme: Theme;
  accessibility: AccessibilitySettings;
  bodyProfile: BodyProfile;
}

const readTheme = (): Theme => {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
};

export const collectLocalSettings = (): SyncableSettings => ({
  theme: readTheme(),
  // Both getters already normalise malformed/missing fields to defaults.
  accessibility: getAccessibilitySettings(),
  bodyProfile: getBodyProfile(),
});

// Write a settings blob (from the server) into local storage and nudge the
// live UI. Theme and accessibility have change events that mounted
// components listen for, so those update on screen immediately; body
// profile has no event and is picked up on the next render that reads it.
export const applyRemoteSettings = (settings: SyncableSettings): void => {
  if (settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'system') {
    localStorage.setItem(THEME_KEY, settings.theme);
    window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: settings.theme }));
  }

  if (settings.accessibility && typeof settings.accessibility === 'object') {
    // setAccessibilitySettings writes as-is and fires its own change
    // event; round-tripping through the getter first re-normalises any
    // field that arrived malformed.
    setAccessibilitySettings({ ...getAccessibilitySettings(), ...settings.accessibility });
  }

  if (settings.bodyProfile && typeof settings.bodyProfile === 'object') {
    const heightCm = settings.bodyProfile.heightCm;
    setBodyProfile({ heightCm: typeof heightCm === 'number' && heightCm > 0 ? heightCm : undefined });
  }
};

// Deterministic JSON: keys sorted at every level, so two settings blobs
// that differ only in key order serialise identically. Used to tell
// "changed since last sync" from "same as last sync" without a per-field
// dirty flag — the same trick syncConflicts.ts uses for records.
const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  const body = Object.keys(record).sort()
    // Match JSON.stringify: a property whose value is `undefined` is
    // omitted entirely. Without this, getBodyProfile()'s `{ heightCm:
    // undefined }` would serialise differently from a bare `{}` and a
    // pristine device would look modified.
    .filter(key => record[key] !== undefined)
    .map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',');
  return `{${body}}`;
};

export const serializeSettings = (settings: SyncableSettings): string => stableStringify(settings);

// The settings a fresh install has before the user touches anything. Used
// to decide, on a device that has never synced settings, whether to defer
// to the server (still all defaults here → yes) or push (something was
// deliberately changed → no, our choice should win).
const DEFAULT_SETTINGS: SyncableSettings = {
  theme: 'system',
  accessibility: ACCESSIBILITY_DEFAULTS,
  bodyProfile: {},
};

export const isPristineSettings = (settings: SyncableSettings): boolean =>
  serializeSettings(settings) === serializeSettings(DEFAULT_SETTINGS);

// --- "what the settings looked like at the last successful sync", so the
// next sync can tell whether this device changed them in the meantime.

interface SettingsSnapshot {
  json: string;
  updatedAt: string;
}

const SNAPSHOT_KEY = 'workout-buddy-sync:settings:snapshot';

export const getSettingsSnapshot = (): SettingsSnapshot | null => {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as SettingsSnapshot) : null;
  } catch {
    return null;
  }
};

export const setSettingsSnapshot = (snapshot: SettingsSnapshot): void => {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* storage full / disabled — snapshot tracking is best-effort */
  }
};

export const clearSettingsSnapshot = (): void => {
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    /* ignore */
  }
};
