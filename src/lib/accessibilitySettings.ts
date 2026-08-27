export type TextSizePreference = 'standard' | 'large';
export type MotionPreference = 'system' | 'reduced' | 'full';

export interface AccessibilitySettings {
  textSize: TextSizePreference;
  motion: MotionPreference;
  haptics: boolean;
  voiceCues: boolean;
  // A soft generative ambient bed during guided workouts. Off by default —
  // music is a strong preference and should never start unasked.
  backgroundMusic: boolean;
  // 0–1. 0.5 is the comfortable default; the players scale it so 1.0 is as
  // loud as each source should reasonably go.
  musicVolume: number;
}

const STORAGE_KEY = 'workout-buddy-accessibility-settings';
export const ACCESSIBILITY_CHANGE_EVENT = 'workout-buddy-accessibility-change';

export const ACCESSIBILITY_DEFAULTS: AccessibilitySettings = {
  textSize: 'standard', motion: 'system', haptics: true, voiceCues: true, backgroundMusic: false, musicVolume: 0.5,
};
const defaults = ACCESSIBILITY_DEFAULTS;

export const getAccessibilitySettings = (): AccessibilitySettings => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<AccessibilitySettings>;
    const legacyVoice = localStorage.getItem('workout-buddy-voice-enabled');
    return {
      textSize: parsed.textSize === 'large' ? 'large' : 'standard',
      motion: parsed.motion === 'reduced' || parsed.motion === 'full' ? parsed.motion : 'system',
      haptics: typeof parsed.haptics === 'boolean' ? parsed.haptics : true,
      voiceCues: typeof parsed.voiceCues === 'boolean' ? parsed.voiceCues : legacyVoice !== 'false',
      backgroundMusic: typeof parsed.backgroundMusic === 'boolean' ? parsed.backgroundMusic : false,
      musicVolume: typeof parsed.musicVolume === 'number' && parsed.musicVolume >= 0 && parsed.musicVolume <= 1
        ? parsed.musicVolume : 0.5,
    };
  } catch { return defaults; }
};

export const setAccessibilitySettings = (settings: AccessibilitySettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent<AccessibilitySettings>(ACCESSIBILITY_CHANGE_EVENT, { detail: settings }));
};
