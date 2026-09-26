// Registers the jest-dom matchers (toBeInTheDocument, toBeDisabled, …) and
// their TypeScript augmentation for `expect`. Harmless for the node-env
// pure tests, which simply never call them.
import '@testing-library/jest-dom/vitest';

// Node 22.4+ ships a global `localStorage`/`sessionStorage`, but when the
// process runs without `--localstorage-file` it's a degraded object with
// no `.clear()` (and it shadows jsdom's working implementation). Swap in a
// plain in-memory Storage whenever the ambient one is missing or broken,
// so tests that touch web storage behave the same on every Node version.
const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    clear: () => { store.clear(); },
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => { store.delete(key); },
    setItem: (key: string, value: string) => { store.set(String(key), String(value)); },
  };
};

const ensureWorkingStorage = (name: 'localStorage' | 'sessionStorage') => {
  const current = (globalThis as Record<string, unknown>)[name] as Storage | undefined;
  if (current && typeof current.clear === 'function' && typeof current.getItem === 'function') return;

  const storage = createMemoryStorage();
  for (const target of [globalThis, (globalThis as { window?: object }).window].filter(Boolean) as object[]) {
    try {
      Object.defineProperty(target, name, { value: storage, configurable: true, writable: true });
    } catch {
      /* non-configurable on this target — the other target still gets it */
    }
  }
};

ensureWorkingStorage('localStorage');
ensureWorkingStorage('sessionStorage');

// jsdom has no ResizeObserver; Radix controls such as Checkbox measure
// themselves with it. A no-op keeps components that render them testable.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() { /* no layout in jsdom */ }
    unobserve() { /* no layout in jsdom */ }
    disconnect() { /* no layout in jsdom */ }
  };
}
