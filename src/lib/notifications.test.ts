import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduledWorkout } from '@/data/scheduledWorkouts';

interface ScheduledNotification {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date; allowWhileIdle: boolean };
  extra: { scheduleId: string; workoutId: string; occurrence: number };
}

const { native, notif, settings } = vi.hoisted(() => ({
  native: { value: true },
  notif: {
    requestPermissions: vi.fn(async () => ({ display: 'granted' })),
    getPending: vi.fn(async () => ({ notifications: [] as { id: number; extra?: Record<string, unknown> }[] })),
    cancel: vi.fn(async (_opts: { notifications: { id: number }[] }) => {}),
    schedule: vi.fn(async (_opts: { notifications: ScheduledNotification[] }) => {}),
  },
  settings: { value: { enabled: true, leadMinutes: 0 } },
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: notif }));
vi.mock('@/lib/notificationSettings', () => ({ getNotificationSettings: () => settings.value }));

import { scheduleWorkoutReminders, cancelWorkoutReminders, rescheduleAllReminders } from './notifications';

const schedule = (over: Partial<ScheduledWorkout> = {}): ScheduledWorkout => ({
  id: 's1', workoutId: 'w1',
  startDate: '2026-06-01', startTime: '08:00', recurrence: 'none',
  createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z',
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-15T12:00:00.000Z'));
  native.value = true;
  settings.value = { enabled: true, leadMinutes: 0 };
  notif.getPending.mockResolvedValue({ notifications: [] });
  notif.requestPermissions.mockResolvedValue({ display: 'granted' });
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

describe('scheduleWorkoutReminders', () => {
  it('does nothing off a native platform', async () => {
    native.value = false;
    await scheduleWorkoutReminders(schedule(), 'Leg Day');
    expect(notif.schedule).not.toHaveBeenCalled();
    expect(notif.requestPermissions).not.toHaveBeenCalled();
  });

  it('cancels existing alarms but schedules nothing when reminders are disabled', async () => {
    settings.value = { enabled: false, leadMinutes: 0 };
    notif.getPending.mockResolvedValue({ notifications: [{ id: 1, extra: { scheduleId: 's1' } }] });
    await scheduleWorkoutReminders(schedule(), 'Leg Day');
    expect(notif.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }] });
    expect(notif.schedule).not.toHaveBeenCalled();
  });

  it('bails when the OS denies notification permission', async () => {
    notif.requestPermissions.mockResolvedValue({ display: 'denied' });
    await scheduleWorkoutReminders(schedule(), 'Leg Day');
    expect(notif.schedule).not.toHaveBeenCalled();
  });

  it('schedules a single future occurrence for a non-recurring workout', async () => {
    await scheduleWorkoutReminders(schedule(), 'Leg Day');
    expect(notif.schedule).toHaveBeenCalledOnce();
    const { notifications } = notif.schedule.mock.calls[0][0];
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      title: 'Workout reminder',
      body: 'Leg Day starts now',
      extra: { scheduleId: 's1', workoutId: 'w1' },
    });
  });

  it('applies the lead time to the fire time and pluralises the body', async () => {
    settings.value = { enabled: true, leadMinutes: 10 };
    await scheduleWorkoutReminders(schedule(), 'Leg Day');
    const { notifications } = notif.schedule.mock.calls[0][0];
    expect(notifications[0].body).toBe('Leg Day starts in 10 minutes');
    // 08:00 local occurrence, 10-minute lead -> fire at 07:50 local
    const fireAt = new Date(notifications[0].schedule.at);
    expect(fireAt.getHours()).toBe(7);
    expect(fireAt.getMinutes()).toBe(50);
  });

  it('expands a weekly multi-day recurrence and skips excluded dates', async () => {
    await scheduleWorkoutReminders(schedule({
      startDate: '2026-06-01', recurrence: 'weekly', recurrenceDays: ['monday', 'wednesday'],
      endRecurrenceDate: '2026-06-14', skippedDates: ['2026-06-03'],
    }), 'Leg Day');
    const { notifications } = notif.schedule.mock.calls[0][0];
    // Mon 1, Wed 3 (skipped), Mon 8, Wed 10 -> 3 remain
    expect(notifications).toHaveLength(3);
  });

  it('drops an occurrence whose lead-adjusted fire time is already past', async () => {
    // 07:55 local, between the 07:50 lead-adjusted fire time and the 08:00 start.
    vi.setSystemTime(new Date(2026, 5, 1, 7, 55, 0));
    settings.value = { enabled: true, leadMinutes: 10 };
    await scheduleWorkoutReminders(schedule({ startDate: '2026-06-01' }), 'Leg Day');
    expect(notif.schedule).not.toHaveBeenCalled();
  });
});

describe('cancelWorkoutReminders', () => {
  it('cancels only the pending alarms tagged with the given schedule id', async () => {
    notif.getPending.mockResolvedValue({
      notifications: [
        { id: 1, extra: { scheduleId: 's1' } },
        { id: 2, extra: { scheduleId: 's2' } },
        { id: 3, extra: { scheduleId: 's1' } },
      ],
    });
    await cancelWorkoutReminders('s1');
    expect(notif.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }, { id: 3 }] });
  });

  it('does not call cancel when nothing matches', async () => {
    notif.getPending.mockResolvedValue({ notifications: [{ id: 2, extra: { scheduleId: 's2' } }] });
    await cancelWorkoutReminders('s1');
    expect(notif.cancel).not.toHaveBeenCalled();
  });
});

describe('rescheduleAllReminders', () => {
  it('reschedules each live schedule and skips soft-deleted ones', async () => {
    await rescheduleAllReminders(
      [schedule({ id: 'a' }), schedule({ id: 'b', deletedAt: '2026-01-01T00:00:00.000Z' })],
      () => 'Leg Day',
    );
    // 'a' schedules once; 'b' is skipped entirely.
    expect(notif.schedule).toHaveBeenCalledOnce();
  });
});
