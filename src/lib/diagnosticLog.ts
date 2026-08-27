// A small rolling log of errors and notable events, kept in localStorage so
// it survives a crash + reload. The user exports it manually from Settings —
// there is no automatic reporting or telemetry.

const STORAGE_KEY = 'workout-buddy-diagnostics';
const MAX_ENTRIES = 200;
const MAX_MESSAGE_LENGTH = 800;

export type DiagnosticLevel = 'info' | 'warn' | 'error';

export interface DiagnosticEntry {
  t: string;
  level: DiagnosticLevel;
  msg: string;
}

const read = (): DiagnosticEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const logDiagnostic = (level: DiagnosticLevel, message: string): void => {
  try {
    const next = read();
    next.push({ t: new Date().toISOString(), level, msg: String(message).slice(0, MAX_MESSAGE_LENGTH) });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-MAX_ENTRIES)));
  } catch {
    /* storage full / disabled — diagnostics are best-effort */
  }
};

export const getDiagnostics = (): DiagnosticEntry[] => read();

export const clearDiagnostics = (): void => {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
};

export const formatDiagnostics = (): string => {
  const header = [
    `Workout Buddy ${typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown'}`,
    typeof navigator !== 'undefined' ? navigator.userAgent : '',
    `exported ${new Date().toISOString()}`,
  ].filter(Boolean).join(' · ');
  const lines = read().map(entry => `${entry.t}  ${entry.level.toUpperCase().padEnd(5)}  ${entry.msg}`);
  return [header, '', ...(lines.length ? lines : ['(no entries)'])].join('\n');
};
