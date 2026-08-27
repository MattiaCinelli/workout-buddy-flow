# Guided-workout audio

Optional background music that plays while a guided workout is running
(`/workout/:id/start`). It is **off by default** — music is a strong
preference and should never start unasked.

There are two sources:

| Source | When it plays | Notes |
| --- | --- | --- |
| **Generated ambient** | Whenever music is on and no custom file is set | Synthesised live with the Web Audio API. No asset, no licensing, works offline. |
| **Your own file** | Whenever music is on and a file has been chosen | Any audio file the user picks, stored on the device. Loops for the whole session. |

This is separate from the **voice cues** (spoken step / rep / countdown
announcements via `@capacitor-community/text-to-speech`) and the **haptic
cues** (vibration on step change). Music sits at a low volume so voice cues
stay clearly on top.

## Using it (as a user)

1. **Settings → Accessibility → Background music** — turn the switch on.
   (It can also be toggled mid-workout with the music button in the guided
   screen's header; both stay in sync.)
2. With the switch on, a panel appears:
   - **Use your own file** — pick an audio file (MP3, OGG, M4A, …). It is
     saved on this device and used from the next workout onward.
   - **Replace file** / **Remove** — swap the file, or fall back to the
     generated ambient.
3. Start any workout. The track plays continuously and only pauses for the
   completion dialog.

Notes:

- The choice is **device-local** — it is not synced and not included in a
  JSON backup, the same as the other accessibility settings.
- Changing the file takes effect on the **next** workout, not one already
  running.
- Max file size is **25 MB** (`MAX_TRACK_BYTES`). Non-audio files are
  rejected.
- Playback volume is fixed: ~`0.55` for a user file, ~`0.13` for the
  generated ambient. There is no volume slider yet — re-encode a track
  that is too loud or quiet.

## Where it lives (code map)

| File | Responsibility |
| --- | --- |
| `src/lib/accessibilitySettings.ts` | `backgroundMusic: boolean` in `AccessibilitySettings` (default `false`). Persisted to `localStorage`. |
| `src/lib/ambientAudio.ts` | `createAmbientPlayer()` — the generative Web Audio bed. `createFilePlayer(blob)` — a looping `<audio>` element. Both return the same `AmbientPlayer` interface (`start / stop / suspend / resume / setVolume / playing`). |
| `src/lib/customAudio.ts` | Stores the one optional user track as a `Blob` in its **own** IndexedDB database, `workout-buddy-audio` (kept out of the main store so a multi-MB file never touches sync or backup). `getCustomTrack` / `setCustomTrack` / `clearCustomTrack`. |
| `src/hooks/useWorkoutMusic.ts` | Ties it together: picks file-vs-synth at workout start, owns the player lifecycle, handles the autoplay gate and backgrounding. |
| `src/components/CustomMusicPicker.tsx` | The file picker shown under the Background-music switch in Settings. |
| `src/components/AccessibilityPreferences.tsx` | Renders the switch + `<CustomMusicPicker />`. |
| `src/pages/WorkoutPresentation.tsx` | Calls `useWorkoutMusic(musicEnabled, restored && !completionOpen)` and renders the header toggle button. |

## Playback lifecycle

`useWorkoutMusic(enabled, active)`:

- **Runs while `enabled && active`.** In the guided screen `active` is
  `restored && !completionOpen`, so the track covers the whole session
  (prep, all steps, rests) and stops for the completion dialog and on
  leaving the screen.
- **Source is chosen once, at start.** `getCustomTrack()` (async) decides
  between `createFilePlayer` and `createAmbientPlayer`.
- **Autoplay gate.** Browsers/WebViews only allow audio to start after a
  user gesture. Reaching the guided screen came from a tap, but if the
  `AudioContext` / `<audio>` still starts suspended, the next `pointerdown`
  or `keydown` anywhere on the page calls `player.resume()`.
- **Backgrounding.** A `visibilitychange` listener suspends the player when
  the tab/app is hidden and resumes it when visible again.
- **Cleanup.** On unmount or when `enabled`/`active` goes false, the player
  is stopped: gains ramp to silence, oscillators stop, the `AudioContext`
  is closed, any object URL is revoked.

## The generated ambient (`createAmbientPlayer`)

A deliberately plain, slow texture:

- Four detuned sine oscillators at `110 Hz` × `{1, 1.5, 2, 3}` (root,
  fifth, octave, twelfth) through a shared low-pass filter.
- A `0.05 Hz` LFO (~20 s period) on the filter cutoff for a "breathing"
  swell.
- A soft sine "bell" from a low pentatonic set (`BELL_HZ`) every
  9–22 s, panned randomly across the stereo field, with a long
  exponential decay.
- Master gain ramps in over ~2.5 s on start and out over ~0.8 s on stop.

To change the mood, edit `ambientAudio.ts`: the oscillator ratios / detune
/ level array, the `filter.frequency` base and LFO depth, `BELL_HZ`, or the
bell interval in `scheduleBell`. For quick iteration, copy the body of
`createAmbientPlayer` into a throwaway `.html` file with a play/stop button
so you can hear changes without launching the app.

## Adding a bundled default track (future option)

Currently the built-in option is the synth, not a shipped file. To offer a
CC0 track as the default instead:

1. Drop the file in `public/audio/` (e.g. `public/audio/ambient-loop.ogg`).
   Keep it small and seamless-looping.
2. In `useWorkoutMusic.ts`, when there is no custom track, create a
   `createFilePlayer` pointed at `/audio/ambient-loop.ogg` (fetch → blob,
   or pass the URL through a small variant of `createFilePlayer`) instead
   of `createAmbientPlayer()`.
3. Keep the synth as the fallback for when the fetch fails (offline first
   load before the asset is cached).

Good no-attribution sources: Pixabay Music, Free Music Archive (Ambient),
OpenGameArt CC0 music.

## Platform notes

- **Android (Capacitor WebView):** Web Audio and a blob-URL `<audio>`
  element both work. IndexedDB blob storage works. The same autoplay-gate
  handling applies.
- **Tests:** the audio players touch `AudioContext` / `Audio` and are not
  unit-tested (consistent with other Web-Audio/DOM code). `createFilePlayer`
  guards `typeof Audio` and `ambientAudio` guards `typeof window` so
  importing the modules under Node/SSR is safe.
