import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

// Registers the service worker and, when a new build is precached, shows a
// dismissible "Update available" toast instead of swapping the running code
// mid-session. Renders nothing itself.
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error) => console.warn('Service worker registration failed:', error),
  });

  useEffect(() => {
    if (!needRefresh) return;
    const id = toast('A new version is available', {
      duration: Infinity,
      action: {
        label: 'Reload',
        onClick: () => void updateServiceWorker(true),
      },
      onDismiss: () => setNeedRefresh(false),
      onAutoClose: () => setNeedRefresh(false),
    });
    return () => { toast.dismiss(id); };
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
