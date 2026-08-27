import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Whether Android will actually deliver a reminder depends on two OS-level
// grants that live entirely outside this app's settings:
//
//  - the POST_NOTIFICATIONS runtime permission (Android 13+), and
//  - the "Alarms & reminders" / exact-alarm setting (Android 12+), which the
//    plugin schedules against because reminders use `allowWhileIdle`.
//
// The in-app "Workout reminders" switch is just a preference — it can be on
// while either grant is missing, in which case nothing fires. This module
// reads the real state so the UI can say so.

export type PermState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface NotificationDiagnostics {
  /** False on web — reminders are an installed-app feature. */
  supported: boolean;
  /** POST_NOTIFICATIONS runtime permission. */
  notifications: PermState;
  /** Exact-alarm app setting. 'unsupported' on Android < 12 and on iOS/web,
   *  where there is nothing for the user to configure. */
  exactAlarm: PermState;
}

// Capacitor's PermissionState adds 'prompt-with-rationale'; collapse it.
const normalize = (state: string | undefined): PermState =>
  state === 'granted' ? 'granted'
    : state === 'denied' ? 'denied'
      : state === 'prompt' || state === 'prompt-with-rationale' ? 'prompt'
        : 'unsupported';

export const getNotificationDiagnostics = async (): Promise<NotificationDiagnostics> => {
  if (!Capacitor.isNativePlatform()) {
    return { supported: false, notifications: 'unsupported', exactAlarm: 'unsupported' };
  }

  let notifications: PermState = 'unsupported';
  try {
    notifications = normalize((await LocalNotifications.checkPermissions()).display);
  } catch (error) {
    console.warn('Could not read notification permission:', error);
  }

  let exactAlarm: PermState = 'unsupported';
  try {
    // Added in the plugin's v6 API and Android-only — absent or throwing
    // means there's nothing to configure on this platform.
    exactAlarm = normalize((await LocalNotifications.checkExactNotificationSetting()).exact_alarm);
  } catch (error) {
    console.warn('Could not read exact-alarm setting:', error);
  }

  return { supported: true, notifications, exactAlarm };
};

export const requestNotificationPermission = async (): Promise<PermState> => {
  try {
    return normalize((await LocalNotifications.requestPermissions()).display);
  } catch (error) {
    console.warn('Requesting notification permission failed:', error);
    return 'denied';
  }
};

// Sends the user to the system screen for exact alarms (Android 12+). On
// older Android the plugin resolves 'granted' without navigating.
export const openExactAlarmSettings = async (): Promise<PermState> => {
  try {
    return normalize((await LocalNotifications.changeExactNotificationSetting()).exact_alarm);
  } catch (error) {
    console.warn('Opening exact-alarm settings failed:', error);
    return 'denied';
  }
};

// True when nothing OS-level is standing between a scheduled reminder and
// its delivery. An 'unsupported' exact-alarm state is fine — it means the
// platform has no such gate.
export const canDeliverReminders = (diagnostics: NotificationDiagnostics): boolean =>
  diagnostics.supported
  && diagnostics.notifications === 'granted'
  && (diagnostics.exactAlarm === 'granted' || diagnostics.exactAlarm === 'unsupported');
