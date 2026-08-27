import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';
const THEME_CHANGE_EVENT = 'workout-buddy-theme-change';

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme');
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const update = (event: Event) => setThemeState((event as CustomEvent<Theme>).detail);
    window.addEventListener(THEME_CHANGE_EVENT, update);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, update);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    const resolved = theme === 'system' ? systemTheme : theme;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme, systemTheme]);

  const toggleTheme = () => {
    setTheme((theme === 'system' ? systemTheme : theme) === 'light' ? 'dark' : 'light');
  };

  const setTheme = (next: Theme) => {
    setThemeState(next);
    window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: next }));
  };

  return { theme, resolvedTheme: theme === 'system' ? systemTheme : theme, setTheme, toggleTheme };
}
