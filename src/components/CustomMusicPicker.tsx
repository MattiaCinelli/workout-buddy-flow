import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Music, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { clearCustomTrack, getCustomTrack, MAX_TRACK_BYTES, setCustomTrack } from '@/lib/customAudio';

// Lets the user swap the generated ambient bed for a backing track of their
// own. The file is stored on the device (see customAudio.ts) and loops
// during guided workouts; changes take effect from the next workout.
export function CustomMusicPicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getCustomTrack().then(track => setTrackName(track?.name ?? null));
  }, []);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error('Please choose an audio file (MP3, OGG, M4A…).');
      return;
    }
    if (file.size > MAX_TRACK_BYTES) {
      toast.error('Audio file must be under 25 MB.');
      return;
    }
    setBusy(true);
    try {
      await setCustomTrack(file);
      setTrackName(file.name);
      toast.success('Your track will play on your next workout.');
    } catch (error) {
      console.error('Could not store custom track:', error);
      toast.error('Could not save that file.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await clearCustomTrack();
      setTrackName(null);
    } catch (error) {
      console.error('Could not remove custom track:', error);
      toast.error('Could not remove the file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border bg-muted/40 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <Music className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {trackName ? <>Your file: <span className="font-medium">{trackName}</span></> : 'Generated ambient (built-in)'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />{trackName ? 'Replace file' : 'Use your own file'}
        </Button>
        {trackName && (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={remove}>
            <X className="h-4 w-4 mr-1" />Remove
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Stored on this device only, and it loops for the whole workout. Keep files small — under 25 MB.
      </p>
      <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
