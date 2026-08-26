const STORAGE_KEY = 'workout-buddy-notification-settings';

export interface NotificationSettings {
  enabled: boolean;
  // How many minutes before the scheduled time to fire the reminder. 0
  // means "at the scheduled time" — matches the original fixed behavior.
  leadMinutes: number;
}

export const LEAD_MINUTE_OPTIONS = [0, 5, 10, 15, 30, 60] as const;

const DEFAULT_SETTINGS: NotificationSettings = { enabled: true, leadMinutes: 0 };

export const getNotificationSettings = (): NotificationSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
      leadMinutes: typeof parsed.leadMinutes === 'number' ? parsed.leadMinutes : DEFAULT_SETTINGS.leadMinutes,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const setNotificationSettings = (settings: NotificationSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
