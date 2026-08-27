import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  native: true,
  checkPermissions: vi.fn(),
  checkExact: vi.fn(),
  requestPermissions: vi.fn(),
  changeExact: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => mockState.native },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: () => mockState.checkPermissions(),
    checkExactNotificationSetting: () => mockState.checkExact(),
    requestPermissions: () => mockState.requestPermissions(),
    changeExactNotificationSetting: () => mockState.changeExact(),
  },
}));

import {
  canDeliverReminders, getNotificationDiagnostics, openExactAlarmSettings, requestNotificationPermission,
} from './notificationDiagnostics';

beforeEach(() => {
  mockState.native = true;
  mockState.checkPermissions.mockResolvedValue({ display: 'granted' });
  mockState.checkExact.mockResolvedValue({ exact_alarm: 'granted' });
  mockState.requestPermissions.mockResolvedValue({ display: 'granted' });
  mockState.changeExact.mockResolvedValue({ exact_alarm: 'granted' });
});

describe('getNotificationDiagnostics', () => {
  it('reports web as unsupported without touching the plugin', async () => {
    mockState.native = false;
    expect(await getNotificationDiagnostics()).toEqual({
      supported: false, notifications: 'unsupported', exactAlarm: 'unsupported',
    });
    expect(mockState.checkPermissions).not.toHaveBeenCalled();
  });

  it('passes through both grants when everything is allowed', async () => {
    const diagnostics = await getNotificationDiagnostics();
    expect(diagnostics).toEqual({ supported: true, notifications: 'granted', exactAlarm: 'granted' });
    expect(canDeliverReminders(diagnostics)).toBe(true);
  });

  it('normalizes prompt-with-rationale to prompt', async () => {
    mockState.checkPermissions.mockResolvedValue({ display: 'prompt-with-rationale' });
    const diagnostics = await getNotificationDiagnostics();
    expect(diagnostics.notifications).toBe('prompt');
    expect(canDeliverReminders(diagnostics)).toBe(false);
  });

  it('treats a missing exact-alarm API as "nothing to configure"', async () => {
    mockState.checkExact.mockRejectedValue(new Error('not implemented'));
    const diagnostics = await getNotificationDiagnostics();
    expect(diagnostics.exactAlarm).toBe('unsupported');
    // notifications still granted, and an unsupported gate does not block
    expect(canDeliverReminders(diagnostics)).toBe(true);
  });

  it('blocks delivery when notifications are denied', async () => {
    mockState.checkPermissions.mockResolvedValue({ display: 'denied' });
    expect(canDeliverReminders(await getNotificationDiagnostics())).toBe(false);
  });

  it('blocks delivery when exact alarms are only prompted', async () => {
    mockState.checkExact.mockResolvedValue({ exact_alarm: 'prompt' });
    const diagnostics = await getNotificationDiagnostics();
    expect(diagnostics.exactAlarm).toBe('prompt');
    expect(canDeliverReminders(diagnostics)).toBe(false);
  });
});

describe('actions', () => {
  it('requestNotificationPermission returns the resulting state', async () => {
    mockState.requestPermissions.mockResolvedValue({ display: 'denied' });
    expect(await requestNotificationPermission()).toBe('denied');
  });

  it('openExactAlarmSettings returns the resulting state, and denied on failure', async () => {
    mockState.changeExact.mockResolvedValue({ exact_alarm: 'granted' });
    expect(await openExactAlarmSettings()).toBe('granted');
    mockState.changeExact.mockRejectedValue(new Error('no activity'));
    expect(await openExactAlarmSettings()).toBe('denied');
  });
});
