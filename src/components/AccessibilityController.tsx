import { useEffect } from 'react';
import { ACCESSIBILITY_CHANGE_EVENT, AccessibilitySettings, getAccessibilitySettings } from '@/lib/accessibilitySettings';

const apply = (settings: AccessibilitySettings) => {
  const root = document.documentElement;
  root.classList.toggle('text-size-large', settings.textSize === 'large');
  const systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.toggle('reduce-motion', settings.motion === 'reduced' || (settings.motion === 'system' && systemReduced));
};

export function AccessibilityController() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => apply(getAccessibilitySettings());
    const onPreference = (event: Event) => apply((event as CustomEvent<AccessibilitySettings>).detail);
    update();
    media.addEventListener('change', update);
    window.addEventListener(ACCESSIBILITY_CHANGE_EVENT, onPreference);
    return () => {
      media.removeEventListener('change', update);
      window.removeEventListener(ACCESSIBILITY_CHANGE_EVENT, onPreference);
    };
  }, []);
  return null;
}
