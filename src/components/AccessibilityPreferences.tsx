import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { AccessibilitySettings, getAccessibilitySettings, setAccessibilitySettings } from '@/lib/accessibilitySettings';
import { CustomMusicPicker } from '@/components/CustomMusicPicker';
import { cn } from '@/lib/utils';

export function AccessibilityPreferences() {
  const [settings, setSettings] = useState(getAccessibilitySettings);
  const change = (updates: Partial<AccessibilitySettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next); setAccessibilitySettings(next);
  };

  return <div className="space-y-6">
    <fieldset className="space-y-2"><legend className="text-sm font-medium">Text size</legend>
      <div className="grid grid-cols-2 gap-2">
        {(['standard', 'large'] as const).map(value => <Button key={value} type="button" variant="outline"
          aria-pressed={settings.textSize === value} onClick={() => change({ textSize: value })}
          className={cn(settings.textSize === value && 'border-primary bg-primary/10 text-primary')}>
          {value === 'standard' ? 'Standard' : 'Large'}
        </Button>)}
      </div>
    </fieldset>
    <fieldset className="space-y-2"><legend className="text-sm font-medium">Motion</legend>
      <div className="grid grid-cols-3 gap-2">
        {([['system', 'System'], ['reduced', 'Reduced'], ['full', 'Full']] as const).map(([value, label]) =>
          <Button key={value} type="button" variant="outline" aria-pressed={settings.motion === value}
            onClick={() => change({ motion: value })}
            className={cn('px-2', settings.motion === value && 'border-primary bg-primary/10 text-primary')}>{label}</Button>)}
      </div>
    </fieldset>
    <div className="flex items-center justify-between gap-4"><div><Label htmlFor="accessibility-voice">Voice cues</Label>
      <p className="text-sm text-muted-foreground">Speak steps, reps, and countdowns during guided workouts.</p></div>
      <Switch id="accessibility-voice" checked={settings.voiceCues} onCheckedChange={checked => change({ voiceCues: checked })} />
    </div>
    <div className="flex items-center justify-between gap-4"><div><Label htmlFor="accessibility-haptics">Haptic cues</Label>
      <p className="text-sm text-muted-foreground">Vibrate when workout steps change.</p></div>
      <Switch id="accessibility-haptics" checked={settings.haptics} onCheckedChange={checked => change({ haptics: checked })} />
    </div>
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4"><div><Label htmlFor="accessibility-music">Background music</Label>
        <p className="text-sm text-muted-foreground">Plays during guided workouts. Toggle it anytime from the workout screen too.</p></div>
        <Switch id="accessibility-music" checked={settings.backgroundMusic} onCheckedChange={checked => change({ backgroundMusic: checked })} />
      </div>
      {settings.backgroundMusic && <>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="accessibility-music-volume">Music volume</Label>
            <span className="text-sm text-muted-foreground">{Math.round(settings.musicVolume * 100)}%</span>
          </div>
          <Slider
            id="accessibility-music-volume" min={0} max={1} step={0.05}
            value={[settings.musicVolume]}
            onValueChange={([value]) => change({ musicVolume: value })}
          />
        </div>
        <CustomMusicPicker />
      </>}
    </div>
  </div>;
}
