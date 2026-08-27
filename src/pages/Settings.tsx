import { useRef, useState } from 'react';
import {
  Accessibility, Bell, Cloud, Database, Download, ExternalLink, Info, Laptop, Moon, Settings as SettingsIcon,
  Sun, Upload, UserRound,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { AccountProfileTab } from '@/components/AccountProfileTab';
import { SyncSettingsPanel } from '@/components/SyncSettingsPanel';
import { ReminderPreferences, RemindersDialog } from '@/components/RemindersButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { downloadBackup, parseBackup, restoreBackup, WorkoutBuddyBackup } from '@/lib/backup';
import { clearDiagnostics, formatDiagnostics } from '@/lib/diagnosticLog';
import { saveTextFile } from '@/lib/downloadFile';
import { scheduleWorkoutReminders } from '@/lib/notifications';
import { isConnected } from '@/lib/syncClient';
import { useTheme, Theme } from '@/hooks/useTheme';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AccessibilityPreferences } from '@/components/AccessibilityPreferences';

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
];

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const data = useData();
  const [connected, setConnected] = useState(isConnected());
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<WorkoutBuddyBackup | null>(null);
  const [backupWarnings, setBackupWarnings] = useState<string[]>([]);
  const backupInput = useRef<HTMLInputElement>(null);
  const recordCount = data.exercises.length + data.workouts.length + data.sessions.length
    + data.scheduledWorkouts.length + data.courses.length + data.muscleGroups.length + data.bodyMetrics.length;

  const selectBackup = async (file?: File) => {
    if (!file) return;
    try {
      const { data, warnings } = parseBackup(await file.text());
      setPendingBackup(data);
      setBackupWarnings(warnings);
      setRestoreOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid backup file');
    }
  };

  const exportDiagnostics = async () => {
    try {
      await saveTextFile(formatDiagnostics(), `workout-buddy-diagnostics-${new Date().toISOString().slice(0, 10)}.txt`, 'text/plain');
    } catch (error) {
      console.error('Diagnostic export failed:', error);
      toast.error('Could not export the diagnostic log.');
    }
  };

  const confirmRestore = async () => {
    if (!pendingBackup) return;
    try {
      await restoreBackup(pendingBackup);
      await Promise.all(pendingBackup.data.scheduledWorkouts.map(schedule =>
        scheduleWorkoutReminders(
          schedule,
          pendingBackup.data.workouts.find(workout => workout.id === schedule.workoutId)?.title || 'Workout',
        )
      ));
      window.location.reload();
    } catch {
      toast.error('Restore failed; current data was not reloaded');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5"><SettingsIcon className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage this device, your data, and optional sync.</p>
          </div>
        </div>

        <div className="grid gap-5">
          <Card id="sync">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5" />Sync</CardTitle>
              <CardDescription>Keep your library current across devices using your self-hosted server.</CardDescription>
            </CardHeader>
            <CardContent><SyncSettingsPanel onConnectionChange={setConnected} /></CardContent>
          </Card>

          <Card id="account">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" />Account</CardTitle>
              <CardDescription>Update the profile used by your sync server.</CardDescription>
            </CardHeader>
            <CardContent>
              {connected ? <AccountProfileTab onDisconnected={() => setConnected(false)} /> : (
                <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                  Connect to your sync server above to manage your display name, email, and password.
                </p>
              )}
            </CardContent>
          </Card>

          <Card id="reminders">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Reminders</CardTitle>
              <CardDescription>Choose when the installed app notifies you about scheduled workouts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ReminderPreferences />
              <Button variant="outline" onClick={() => setRemindersOpen(true)}>View upcoming reminders</Button>
            </CardContent>
          </Card>

          <Card id="appearance">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sun className="h-5 w-5" />Appearance</CardTitle>
              <CardDescription>Choose a theme or follow your phone's appearance setting.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Color theme">
                {themeOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <Button key={option.value} type="button" variant="outline" onClick={() => setTheme(option.value)}
                      aria-pressed={theme === option.value}
                      className={cn('h-auto flex-col gap-2 py-3', theme === option.value && 'border-primary bg-primary/10 text-primary')}>
                      <Icon className="h-5 w-5" />{option.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card id="accessibility">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Accessibility className="h-5 w-5" />Accessibility</CardTitle>
              <CardDescription>Adjust readability, motion, and guided-workout cues on this device.</CardDescription>
            </CardHeader>
            <CardContent><AccessibilityPreferences /></CardContent>
          </Card>

          <Card id="data">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Data and backup</CardTitle>
              <CardDescription>Your workout data is stored locally on this device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="font-medium">{recordCount.toLocaleString()} local records</p>
                <p className="text-sm text-muted-foreground">
                  {data.exercises.length} exercises · {data.workouts.length} workouts · {data.sessions.length} sessions ·{' '}
                  {data.scheduledWorkouts.length} scheduled · {data.courses.length} courses ·{' '}
                  {data.muscleGroups.length} muscle groups · {data.bodyMetrics.length} body measurements
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={async () => {
                  try { await downloadBackup(); toast.success('Backup exported'); }
                  catch { toast.error('Could not create backup'); }
                }}><Download className="mr-2 h-4 w-4" />Export backup</Button>
                <Button variant="outline" onClick={() => backupInput.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />Restore backup
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Export regularly and save the JSON file somewhere outside this device.</p>
              <input ref={backupInput} type="file" accept="application/json,.json" className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  void selectBackup(file);
                }} />
            </CardContent>
          </Card>

          <Card id="about">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5" />About</CardTitle>
              <CardDescription>Workout Buddy version {__APP_VERSION__}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Offline-first and private by default. No account or server is required unless you choose to enable sync.</p>
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
                Not medical advice. Consult a doctor before starting a new exercise programme, and stop
                if you feel pain. Suggested weights and progressions are guidance from your own logged
                history, not a prescription.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <a href="https://github.com/MattiaCinelli/workout-buddy-flow/releases/latest" target="_blank" rel="noreferrer">
                    Check for updates <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" onClick={exportDiagnostics}>Export diagnostic log</Button>
                <Button variant="ghost" onClick={() => { clearDiagnostics(); toast.success('Diagnostic log cleared'); }}>Clear log</Button>
              </div>
              <p className="text-xs">
                The diagnostic log is a short local record of errors and sync events, kept on this device
                for troubleshooting. Nothing is sent anywhere.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <RemindersDialog open={remindersOpen} onOpenChange={setRemindersOpen} />
      <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all local data?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces exercises, workouts, sessions, schedules, courses{pendingBackup?.version === 3 ? ', and device preferences' : ''} on
              this device with the selected backup. Export the current data first if you may need it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {backupWarnings.length > 0 && (
            <ul className="list-disc space-y-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 pl-6 text-xs text-amber-700 dark:text-amber-300">
              {backupWarnings.map((warning, index) => <li key={index}>{warning}</li>)}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>Restore and replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
