import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type InterfaceStyle = 'classic' | 'starship';
const THEME_CHANGE_EVENT = 'workout-buddy-theme-change';
const INTERFACE_CHANGE_EVENT = 'workout-buddy-interface-change';

const browserThemeColors = {
  classic: { light: '#f7f8fa', dark: '#080b16' },
  starship: { light: '#f7f0e3', dark: '#08080f' },
} as const;

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export function updateBrowserThemeColor() {
  const root = document.documentElement;
  const style = root.classList.contains('starship') ? 'starship' : 'classic';
  const mode = root.classList.contains('dark') ? 'dark' : 'light';
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
  }
  meta.content = browserThemeColors[style][mode];
}

/** Apply saved appearance before React renders to avoid a flash of the default UI. */
export function applyStoredAppearance() {
  const root = document.documentElement;
  const storedTheme = localStorage.getItem('theme');
  const resolvedTheme = storedTheme === 'dark' ||
    (storedTheme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ? 'dark' : 'light';
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.classList.toggle('starship', localStorage.getItem('interface-style') === 'starship');
  updateBrowserThemeColor();
}

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
    updateBrowserThemeColor();
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

export function useInterfaceStyle() {
  const [interfaceStyle, setInterfaceStyleState] = useState<InterfaceStyle>(() =>
    localStorage.getItem('interface-style') === 'starship' ? 'starship' : 'classic'
  );

  useEffect(() => {
    const update = (event: Event) => setInterfaceStyleState((event as CustomEvent<InterfaceStyle>).detail);
    window.addEventListener(INTERFACE_CHANGE_EVENT, update);
    return () => window.removeEventListener(INTERFACE_CHANGE_EVENT, update);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('starship', interfaceStyle === 'starship');
    localStorage.setItem('interface-style', interfaceStyle);
    updateBrowserThemeColor();
  }, [interfaceStyle]);

  const setInterfaceStyle = (next: InterfaceStyle) => {
    setInterfaceStyleState(next);
    window.dispatchEvent(new CustomEvent<InterfaceStyle>(INTERFACE_CHANGE_EVENT, { detail: next }));
  };

  const toggleInterfaceStyle = () => setInterfaceStyle(interfaceStyle === 'starship' ? 'classic' : 'starship');

  return { interfaceStyle, setInterfaceStyle, toggleInterfaceStyle };
}

/** Keeps stored appearance preferences active on every route without rendering controls. */
export function AppearanceController() {
  useTheme();
  useInterfaceStyle();
  return null;
}
