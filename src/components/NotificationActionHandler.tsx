import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useNavigate } from 'react-router-dom';
import { notificationWorkoutSessionUrl } from '@/lib/workoutSessionUrl';

// Native notification taps arrive whether the app was already open or was
// launched from the notification. Keep this mounted inside BrowserRouter so
// both cases enter the guided workout through the normal React route.
const NotificationActionHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;
    void LocalNotifications.addListener('localNotificationActionPerformed', action => {
      const url = notificationWorkoutSessionUrl(action.notification.extra);
      if (url) navigate(url);
    }).then(handle => {
      if (disposed) void handle.remove();
      else removeListener = () => handle.remove();
    });

    return () => {
      disposed = true;
      if (removeListener) void removeListener();
    };
  }, [navigate]);

  return null;
};

export default NotificationActionHandler;
