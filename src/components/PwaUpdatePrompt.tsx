import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

// Registers the service worker and, when a new build is precached, shows a
// snoozable "Update available" toast instead of swapping the running code
// mid-session. Renders nothing itself.
const UPDATE_REMINDER_MS = 30 * 60 * 1000;

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error) => console.warn('Service worker registration failed:', error),
  });
  const [reminder, setReminder] = useState(0);

  useEffect(() => {
    if (!needRefresh) return;
    let active = true;
    let dismissed = false;
    let reminderTimer: number | undefined;

    const remindLater = () => {
      if (!active || dismissed) return;
      dismissed = true;
      reminderTimer = window.setTimeout(() => setReminder(value => value + 1), UPDATE_REMINDER_MS);
    };

    const id = toast('A new version is available', {
      duration: Infinity,
      action: {
        label: 'Reload',
        onClick: () => void updateServiceWorker(true),
      },
      onDismiss: remindLater,
      onAutoClose: remindLater,
    });

    // A dismissed reminder is shown again as soon as the user returns to
    // the app. This catches mobile/PWA sessions that are backgrounded for
    // longer than the timer without forcing a reload during a workout.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && dismissed) {
        if (reminderTimer !== undefined) window.clearTimeout(reminderTimer);
        setReminder(value => value + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      active = false;
      if (reminderTimer !== undefined) window.clearTimeout(reminderTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      toast.dismiss(id);
    };
  }, [needRefresh, reminder, updateServiceWorker]);

  return null;
}
