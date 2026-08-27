/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, cleanup } from '@testing-library/react';
import { useTheme } from './useTheme';

// jsdom has no real matchMedia; default it to "light".
const setSystemDark = (dark: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: dark, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  setSystemDark(false);
});
afterEach(() => cleanup());

describe('useTheme', () => {
  it('defaults to "system" and resolves via matchMedia', () => {
    setSystemDark(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('setTheme persists the choice and toggles the <html> class', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => result.current.setTheme('light'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('reads an existing stored preference on mount', () => {
    localStorage.setItem('theme', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('toggleTheme flips between light and dark', () => {
    localStorage.setItem('theme', 'light');
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('two hook instances stay in sync via the theme-change event', () => {
    const a = renderHook(() => useTheme());
    const b = renderHook(() => useTheme());
    act(() => a.result.current.setTheme('dark'));
    expect(b.result.current.theme).toBe('dark');
  });
});
