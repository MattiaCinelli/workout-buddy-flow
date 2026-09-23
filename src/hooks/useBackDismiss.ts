import { useEffect, useId, useRef } from 'react';

const OVERLAY_HISTORY_KEY = '__workoutBuddyOverlay';

// How long to wait for the browser to report a history.back() we issued
// before carrying on anyway, so a lost event can never wedge the queue.
const POP_TIMEOUT_MS = 600;

// History changes are asynchronous: history.back() only *queues* a traversal,
// while pushState() takes effect immediately. If one overlay closes (popping
// its entry) in the same tap that opens another (pushing its own), the queued
// "back" runs after the push and undoes the NEW overlay's entry — which that
// overlay then reads as the user pressing Back, and dismisses itself. That is
// how tapping Reminders in the phone drawer used to open the dialog and close
// it again a moment later.
//
// So every push/pop across all overlays goes through this one queue and runs
// strictly in order: a pop finishes (its popstate arrives) before the next
// operation starts. With nothing pending an operation runs synchronously, so
// the common case behaves exactly as before.
type HistoryOperation = () => void | Promise<void>;
const queue: HistoryOperation[] = [];
let draining = false;

const drain = async () => {
  if (draining) return;
  draining = true;
  try {
    while (queue.length > 0) {
      const operation = queue.shift()!;
      try { await operation(); } catch (error) { console.warn('Overlay history update failed:', error); }
    }
  } finally {
    draining = false;
  }
};

const enqueue = (operation: HistoryOperation) => {
  queue.push(operation);
  void drain();
};

// Issues history.back() and resolves once the browser has finished it.
const goBackAndWait = () => new Promise<void>(resolve => {
  const finish = () => {
    window.removeEventListener('popstate', finish);
    window.clearTimeout(timer);
    resolve();
  };
  const timer = window.setTimeout(finish, POP_TIMEOUT_MS);
  window.addEventListener('popstate', finish);
  window.history.back();
});

/**
 * Gives an open overlay its own same-URL history entry. Browser Back and the
 * Android WebView Back button can then dismiss the overlay before the route
 * underneath it is allowed to change.
 */
export const useBackDismiss = (open: boolean, dismiss: () => void) => {
  const reactId = useId();
  const overlayId = useRef(`overlay-${reactId}`).current;
  const registered = useRef(false);
  const pushQueued = useRef(false);
  const openRef = useRef(open);
  const dismissRef = useRef(dismiss);

  openRef.current = open;
  dismissRef.current = dismiss;

  useEffect(() => {
    if (!open || registered.current || pushQueued.current || typeof window === 'undefined') return;

    pushQueued.current = true;
    enqueue(() => {
      pushQueued.current = false;
      // Closed again before its turn came: nothing was pushed, nothing to undo.
      if (!openRef.current) return;

      const state = window.history.state && typeof window.history.state === 'object'
        ? window.history.state
        : {};
      window.history.pushState({ ...state, [OVERLAY_HISTORY_KEY]: overlayId }, '', window.location.href);
      registered.current = true;
    });
  }, [open, overlayId]);

  useEffect(() => {
    if (open || !registered.current || typeof window === 'undefined') return;

    registered.current = false;
    enqueue(() => {
      // Only undo our own entry, and only if it is still the current one
      // (Back may already have consumed it, or another overlay sit above it).
      if (window.history.state?.[OVERLAY_HISTORY_KEY] === overlayId) return goBackAndWait();
    });
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
