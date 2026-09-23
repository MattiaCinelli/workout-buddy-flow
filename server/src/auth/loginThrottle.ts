// In-memory brake on password guessing. Failed logins are counted per
// (normalised) email; once MAX_FAILURES accumulate inside WINDOW_MS, further
// attempts for that email are refused until the oldest failure ages out —
// even with the right password, otherwise the limit would only slow the
// attacker's wrong guesses, not stop them.
//
// Keyed by email, not IP: behind a reverse proxy (tailscale serve, a
// container port map) every request appears to come from the proxy's address.
// The trade-off is that anyone who can reach the server can lock an account
// out for WINDOW_MS by failing on purpose; for a self-hosted server that is
// the safer failure than unlimited guessing. State is per process, so a
// restart clears it.

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
// Unknown emails also get an entry (so the throttle can't be used to probe
// which accounts exist). Cap the map so a flood of made-up emails can't grow
// it without bound.
const MAX_TRACKED_KEYS = 10_000;

export interface LoginThrottle {
  /** Milliseconds until another attempt is allowed, or 0 if allowed now. */
  retryAfterMs: (key: string) => number;
  /** Records a failure; returns true if this failure just tripped the limit. */
  recordFailure: (key: string) => boolean;
  recordSuccess: (key: string) => void;
}

export const createLoginThrottle = (now: () => number = Date.now): LoginThrottle => {
  const failures = new Map<string, number[]>();

  const recent = (key: string): number[] => {
    const cutoff = now() - WINDOW_MS;
    const live = (failures.get(key) ?? []).filter(at => at > cutoff);
    if (live.length > 0) failures.set(key, live);
    else failures.delete(key);
    return live;
  };

  return {
    retryAfterMs: key => {
      const live = recent(key);
      if (live.length < MAX_FAILURES) return 0;
      return Math.max(0, live[0] + WINDOW_MS - now());
    },
    recordFailure: key => {
      const live = recent(key);
      if (!failures.has(key) && failures.size >= MAX_TRACKED_KEYS) {
        // Map iterates in insertion order: evict the oldest tracked key.
        failures.delete(failures.keys().next().value as string);
      }
      live.push(now());
      failures.set(key, live);
      return live.length === MAX_FAILURES;
    },
    recordSuccess: key => { failures.delete(key); },
  };
};
