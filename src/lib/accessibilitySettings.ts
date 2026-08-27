export type TextSizePreference = 'standard' | 'large';
export type MotionPreference = 'system' | 'reduced' | 'full';

export interface AccessibilitySettings {
  textSize: TextSizePreference;
  motion: MotionPreference;
  haptics: boolean;
  voiceCues: boolean;
}

const STORAGE_KEY = 'workout-buddy-accessibility-settings';
export const ACCESSIBILITY_CHANGE_EVENT = 'workout-buddy-accessibility-change';

const defaults: AccessibilitySettings = { textSize: 'standard', motion: 'system', haptics: true, voiceCues: true };

export const getAccessibilitySettings = (): AccessibilitySettings => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<AccessibilitySettings>;
    const legacyVoice = localStorage.getItem('workout-buddy-voice-enabled');
    return {
      textSize: parsed.textSize === 'large' ? 'large' : 'standard',
      motion: parsed.motion === 'reduced' || parsed.motion === 'full' ? parsed.motion : 'system',
      haptics: typeof parsed.haptics === 'boolean' ? parsed.haptics : true,
      voiceCues: typeof parsed.voiceCues === 'boolean' ? parsed.voiceCues : legacyVoice !== 'false',
    };
  } catch { return defaults; }
};

export const setAccessibilitySettings = (settings: AccessibilitySettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent<AccessibilitySettings>(ACCESSIBILITY_CHANGE_EVENT, { detail: settings }));
};
