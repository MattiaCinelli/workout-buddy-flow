import { useEffect, useId, useRef } from 'react';

const OVERLAY_HISTORY_KEY = '__workoutBuddyOverlay';

/**
 * Gives an open overlay its own same-URL history entry. Browser Back and the
 * Android WebView Back button can then dismiss the overlay before the route
 * underneath it is allowed to change.
 */
export const useBackDismiss = (open: boolean, dismiss: () => void) => {
  const reactId = useId();
  const overlayId = useRef(`overlay-${reactId}`).current;
  const registered = useRef(false);
  const openRef = useRef(open);
  const dismissRef = useRef(dismiss);

  openRef.current = open;
  dismissRef.current = dismiss;

  useEffect(() => {
    if (!open || registered.current || typeof window === 'undefined') return;

    const state = window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : {};
    window.history.pushState({ ...state, [OVERLAY_HISTORY_KEY]: overlayId }, '', window.location.href);
    registered.current = true;
  }, [open, overlayId]);

  useEffect(() => {
    if (open || !registered.current || typeof window === 'undefined') return;

    registered.current = false;
    if (window.history.state?.[OVERLAY_HISTORY_KEY] === overlayId) {
      window.history.back();
    }
  }, [open, overlayId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      if (!openRef.current || !registered.current) return;
      if (event.state?.[OVERLAY_HISTORY_KEY] === overlayId) return;

      registered.current = false;
      dismissRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [overlayId]);
};

